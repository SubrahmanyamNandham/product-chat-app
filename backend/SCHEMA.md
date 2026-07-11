# Database Schema — MongoDB

Four collections, managed with Mongoose. All timestamps use each document's own `createdAt`.

## `users`

| Field          | Type                        | Notes                              |
|----------------|-----------------------------|--------------------------------------|
| `_id`          | ObjectId                    |                                       |
| `name`         | string                       |                                       |
| `email`        | string                       | unique, lowercased, indexed          |
| `passwordHash` | string                       | bcrypt hash, `select: false` by default |
| `role`         | `'customer' \| 'agent'`     | indexed                              |
| `createdAt`    | Date                         |                                       |

## `products`

| Field          | Type    |
|----------------|---------|
| `_id`          | ObjectId |
| `name`         | string   |
| `description`  | string   |
| `price`        | number   |
| `imageUrl`     | string   |
| `createdAt`    | Date     |

## `conversations`

| Field                     | Type                             | Notes |
|----------------------------|-----------------------------------|-------|
| `_id`                      | ObjectId                          |       |
| `customerId`                | ObjectId → `users`                | indexed |
| `productId`                  | ObjectId → `products`             | indexed |
| `agentId`                    | ObjectId → `users`, nullable      | set on first agent reply |
| `status`                      | `'open' \| 'closed'`             | reopens automatically on a new customer message |
| `lastMessageAt`              | Date                              | drives inbox sort order, indexed descending |
| `lastMessagePreview`         | string                            | first 120 chars of the latest message |
| `unreadCountForAgent`        | number                             | reset via `POST /conversations/:id/read` |
| `unreadCountForCustomer`     | number                             | same |
| `createdAt`                    | Date                              |       |

**Indexes:**
- `{ customerId: 1, productId: 1 }` — **unique**. This is the core business rule: exactly one conversation per (customer, product) pair. Enforced at the database level, not just in application code, so it holds even under concurrent requests.
- `{ lastMessageAt: -1 }` — powers the agent inbox's "most recent activity first" ordering.

## `messages`

| Field             | Type                             | Notes |
|--------------------|-----------------------------------|-------|
| `_id`               | ObjectId                          |       |
| `conversationId`    | ObjectId → `conversations`        | indexed |
| `senderId`           | ObjectId → `users`                 |       |
| `senderRole`          | `'customer' \| 'agent'`           |       |
| `content`             | string (max 4000 chars)            |       |
| `status`               | `'sent' \| 'delivered' \| 'read'` |       |
| `createdAt`             | Date                               |       |

**Indexes:**
- `{ conversationId: 1, createdAt: 1 }` — supports fast, paginated, chronological history loads for a single thread (`GET /conversations/:id/messages`).

## Why this shape

- **One conversation document per (customer, product)** rather than a generic "chat room" model keeps the domain rule ("10 customers × 2 products = 20 threads") explicit and queryable directly, instead of derived at read time.
- **Denormalized `lastMessageAt` / `lastMessagePreview` / unread counts** on the conversation document avoid an aggregation query every time the inbox or chat list renders — those fields are updated in the same write that creates a message.
- **Messages are a separate collection**, not embedded in the conversation, so a thread's history can grow indefinitely without hitting MongoDB's 16MB document size limit, and pagination stays cheap via the compound index.
