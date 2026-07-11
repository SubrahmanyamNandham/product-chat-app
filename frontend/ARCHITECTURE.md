# Architecture Notes

## Real-time design

The chat UI is structured around one conversation-per-customer-product thread. In the Phase 1 demo, this is modeled through mock conversation state, but the architecture is aligned with the planned Socket.IO room-per-conversation approach.

- Each conversation would join a dedicated socket room using the conversation id.
- Messages are persisted first and then broadcast to the room so the experience remains durable.
- Personal rooms such as user:<userId> support inbox updates for agents and customers even before a thread is open.

## Conversation uniqueness

The business rule of one conversation per customer-product pair is enforced in the UI flow by checking for an existing thread before creating a new one. In the backend, this will be enforced with a compound unique index on customerId and productId.

## Authentication flow

The current interface stores a simple session object in local storage to simulate role-based access. In Phase 2, this will be replaced with JWT access and refresh tokens plus server-side guards for customer and agent routes.

## Scaling notes

For multi-instance deployments, the same room-per-conversation design can scale with a Redis-backed Socket.IO adapter so broadcasts remain consistent across multiple servers.
