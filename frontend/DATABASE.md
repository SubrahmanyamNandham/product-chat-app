# Database Schema Notes

The Phase 1 frontend is structured around the planned MongoDB schema for the later backend implementation.

## Users

- _id
- name
- email
- passwordHash
- role: customer | agent
- createdAt

## Products

- _id
- name
- description
- price
- imageUrl
- createdAt

## Conversations

- _id
- customerId
- productId
- agentId (nullable until claimed)
- status: open | closed
- lastMessageAt
- lastMessagePreview
- unreadCountForAgent
- unreadCountForCustomer
- createdAt

A unique compound index on customerId and productId will enforce one conversation per customer-product pair.

## Messages

- _id
- conversationId
- senderId
- senderRole: customer | agent
- content
- status: sent | delivered | read
- createdAt

An index on conversationId and createdAt will support fast history retrieval.
