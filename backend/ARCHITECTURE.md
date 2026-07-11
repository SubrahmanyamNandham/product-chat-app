# Architecture & Design Decisions

## Module layout

```
src/
  auth/        signup, login, refresh, JWT strategy, guards, decorators
  users/       user schema + lookup service (shared by auth and chat)
  products/    product schema + read-only catalog endpoints
  chat/        conversations, messages, REST controller, Socket.IO gateway
  common/      global filters (HTTP + WS) shared across modules
```

Each feature is a self-contained Nest module (schema + service + controller, exported where another module needs it). `ChatModule` depends on `ProductsModule` (to validate a product exists before opening a thread) and `UsersModule`/`AuthModule` indirectly through the shared JWT setup.

## One conversation per (customer, product) — enforced, not assumed

The assignment's central rule — a customer chatting about two products gets two fully independent threads — is enforced with a **unique compound MongoDB index** on `{ customerId, productId }`, not just application-level logic. `ChatService.findOrCreateConversation` first looks up an existing thread, and if none exists, attempts to create one; if two requests race (e.g. a doubled click), the second insert fails with a duplicate-key error which is caught and resolved by re-fetching the now-existing document. This means the guarantee holds even under concurrent load, not just in the happy path.

## Real-time design: rooms, not namespaces

A single Socket.IO namespace (`/chat`) is used for the entire app. Scaling to "20 independent threads" is handled with **rooms keyed by `conversationId`**, not by spinning up a namespace per product or per customer:

- Joining/leaving a room is cheap and stateless per-socket — a customer with two open product chats simply joins two rooms.
- The agent additionally joins a shared `agents` room on connect, so inbox-level events (new conversation, new message, unread count changes) reach every agent immediately, even for threads they haven't opened yet.
- Each user also joins a personal `user:<userId>` room, so a customer's own chat list updates live even when they're not inside the specific thread.

This means the number of concurrent threads scales horizontally with almost no per-thread overhead — the pattern that "10 customers × 2 products = 20 threads" needs.

## Persist-then-broadcast

Every `message:send` event is written to MongoDB **before** it is broadcast to the room. This guarantees message durability is never dependent on the socket layer: if a broadcast is missed (e.g. a client reconnects mid-emit), the message is still retrievable via `GET /conversations/:id/messages` on next load. Conversation metadata (`lastMessageAt`, `lastMessagePreview`, unread counts) is updated in the same service call that creates the message, keeping the two in sync without a separate reconciliation step.

## Auth flow

1. `POST /auth/signup` or `/auth/login` returns a short-lived **access token** (15m) and a longer-lived **refresh token** (7d).
2. The access token is sent as a Bearer header on REST calls and passed via `auth.token` in the Socket.IO handshake.
3. `JwtStrategy` validates the token and attaches `{ userId, email, role, name }` to the request; `JwtAuthGuard` protects REST routes, `RolesGuard` + `@Roles()` restrict specific endpoints (e.g. only customers can create a conversation).
4. The gateway performs its own handshake-time verification (independent of Passport, since sockets don't go through the HTTP guard pipeline) and disconnects any socket that fails to authenticate.
5. `POST /auth/refresh` exchanges a valid refresh token for a new pair, without requiring the password again.

## Scaling beyond a single instance

The current design assumes a single Node process holding the Socket.IO server in memory (rooms live in-process). To run multiple backend instances behind a load balancer:

- Add the **Redis Socket.IO adapter** (`@socket.io/redis-adapter`) so room broadcasts are fanned out across instances — no application code changes needed beyond wiring the adapter in `main.ts`.
- MongoDB already supports this without changes: conversations/messages are the single source of truth, and any instance can serve REST reads/writes.
- For very high message volume, the `messages` collection could be sharded on `conversationId`, since all reads/writes are already scoped to a single conversation at a time.

## Error handling

- `HttpExceptionFilter` normalizes every REST error into `{ statusCode, message, timestamp }`.
- `WsExceptionFilter` catches thrown errors inside gateway handlers and emits a client-facing `error` event instead of crashing the socket connection.
