
Readme · MD
# Luxury Product Support Chat
 
A real-time, product-scoped customer support chat application for a luxury retail brand. Every product a customer chats about gets its own dedicated, persistent conversation thread — an agent managing many customers across many products sees each one as a separate, live-updating chat.
 
Built with **Next.js**, **NestJS**, **MongoDB**, and **Socket.IO**.
 
---
 
## Table of Contents
 
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup — Backend](#setup--backend)
- [Setup — Frontend](#setup--frontend)
- [Running the App](#running-the-app)
- [Demo Accounts](#demo-accounts)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Troubleshooting](#troubleshooting)
---
 
## Features
 
**Customer side**
- Browse a product catalog, each with a "Chat with Agent" action.
- Every product opens its own independent conversation — chatting about two different products creates two fully separate threads with their own history and unread state.
- Real-time message delivery, typing indicators, and read receipts.
- Optimistic sending: your own message appears instantly and reconciles once the server confirms.
**Agent side**
- A single inbox listing every active conversation across every customer, sorted by most recent activity.
- Each (customer, product) pair is its own thread — 10 customers chatting about 2 products each shows up as 20 distinct, independently manageable conversations.
- Live-updating unread badges and inbox re-sorting as new messages arrive, with no manual refresh.
**Both sides**
- JWT authentication with separate `customer` / `agent` roles.
- Full message history persisted in MongoDB — nothing is lost on refresh or reconnect.
- Clean error handling and loading states throughout.
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, TanStack Query, Tailwind CSS |
| Backend | NestJS (TypeScript) |
| Database | MongoDB via Mongoose |
| Real-time | Socket.IO (`@nestjs/websockets` + `socket.io-client`) |
| Auth | JWT (access + refresh tokens), role-based guards |
 
---
 
## Project Structure
 
```
/
├── backend/                 NestJS API + Socket.IO gateway
│   ├── src/
│   │   ├── auth/            Signup, login, refresh, JWT strategy, guards
│   │   ├── users/            User schema + lookups
│   │   ├── products/          Product catalog schema + endpoints
│   │   ├── chat/               Conversations, messages, REST controller, gateway
│   │   └── common/               Shared filters (HTTP + WS error handling)
│   ├── seed/                       Demo data seed script
│   ├── .env.example
│   ├── README.md                    Backend-specific setup notes
│   ├── SCHEMA.md                      MongoDB schema documentation
│   └── ARCHITECTURE.md                 Backend design rationale
│
├── frontend/                 Next.js customer + agent web app
│   ├── src/
│   │   ├── app/                 Routes (login, /customer, /agent)
│   │   ├── components/            chat-app.tsx and other UI components
│   │   ├── lib/                     api.ts — REST + session helpers
│   │   └── types/                     Shared TypeScript types (chat.ts)
│   └── .env.example (or .env.local)
│
└── README.md                  This file
```
 
---
 
## Prerequisites
 
- Node.js 18+
- A running MongoDB instance — local install, Docker, or MongoDB Atlas
- npm (or your package manager of choice)
---
 
## Setup — Backend
 
```bash
cd backend
npm install
cp .env.example .env
```
 
Edit `backend/.env`:
 
```
PORT=4000
NODE_ENV=development
 
# Default local MongoDB — swap this for your own connection string (e.g. Atlas)
MONGODB_URI=mongodb://localhost:27017/luxury_chat
 
JWT_ACCESS_SECRET=change-this-access-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-this-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
 
FRONTEND_ORIGIN=http://localhost:3000
```
 
No local MongoDB? The quickest option is Docker:
 
```bash
docker run -d -p 27017:27017 --name luxury-chat-mongo mongo:7
```
 
Seed demo data (products + demo customer/agent accounts):
 
```bash
npm run seed
```
 
---
 
## Setup — Frontend
 
```bash
cd frontend
npm install
```
 
Create `frontend/.env.local`:
 
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```
 
---
 
## Running the App
 
In two separate terminals:
 
```bash
# Terminal 1 — backend
cd backend
npm run start:dev
```
 
```bash
# Terminal 2 — frontend
cd frontend
npm run dev
```
 
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:4000/api](http://localhost:4000/api)
- Socket.IO gateway: same host/port, `/chat` namespace
---
 
## Demo Accounts
 
Created by `npm run seed` in the backend (password for all: `password123`):
 
| Role | Email |
|---|---|
| Customer | [email protected] |
| Customer | [email protected] |
| Agent | [email protected] |
| Agent | [email protected] |
 
To see the multi-thread behavior: log in as a customer in one browser, start chats on two different products, then log in as an agent in a second browser/incognito window and watch both threads appear live in the inbox.
 
---
 
## Architecture Overview
 
- **One conversation per (customer, product) pair**, enforced with a unique compound MongoDB index on `{ customerId, productId }` — not just application-level logic, so the guarantee holds even under concurrent requests (e.g. a doubled click on "Chat with Agent").
- **Single Socket.IO namespace (`/chat`), rooms keyed by `conversationId`** — this is what lets the app scale to many concurrent threads cheaply, rather than provisioning a namespace per product or per customer. Agents additionally join a shared `agents` room so inbox-level updates (new conversation, new message, unread counts) reach them immediately, even for threads they haven't opened.
- **Persist-then-broadcast**: every message is written to MongoDB before it's emitted over the socket, so message durability never depends on the real-time layer — a missed broadcast is still recoverable on the next history load.
- Full design rationale lives in `backend/ARCHITECTURE.md`.
---
 
## Database Schema
 
Four MongoDB collections: `users`, `products`, `conversations`, `messages`.
 
The full field-by-field schema and index documentation is in `backend/SCHEMA.md`. The short version:
 
- `conversations` has a **unique index on `{ customerId, productId }`** — the core rule that keeps every product's chat independent.
- `messages` are a separate collection (not embedded in `conversations`) so history can grow indefinitely, with an index on `{ conversationId, createdAt }` for fast paginated loads.
---
 
## API Reference
 
Base URL: `http://localhost:4000/api`
 
### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/signup` | `{ name, email, password, role }` | `role`: `customer` \| `agent` |
| POST | `/auth/login` | `{ email, password }` | Returns `accessToken`, `refreshToken`, `user` |
| POST | `/auth/refresh` | `{ refreshToken }` | Returns a fresh token pair |
| GET | `/auth/me` | — (Bearer token) | Returns the current user |
 
### Products (Bearer token required)
| Method | Endpoint |
|---|---|
| GET | `/products` |
| GET | `/products/:id` |
 
### Chat (Bearer token required)
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/chat/conversations` | any | Customer → own threads. Agent → full inbox. |
| POST | `/chat/conversations` | customer | `{ productId }` — finds or creates that product's thread |
| GET | `/chat/conversations/:id/messages` | any | `?before=<ISO date>` for older pages |
| POST | `/chat/conversations/:id/read` | any | Marks the other party's messages read |
 
---
 
## WebSocket Events
 
Namespace: `/chat`. Connect with `auth: { token: accessToken }`.
 
**Client → Server**: `conversation:join`, `conversation:leave`, `message:send`, `typing:start`, `typing:stop`, `message:read`
 
**Server → Client**: `message:new`, `conversation:updated`, `typing:start` / `typing:stop`, `error`
 
Full payload shapes are documented in `backend/README.md`.
 
---
 
## Troubleshooting
 
- **403 "You do not have access to this conversation"** — usually means a stale conversation ID from a previous session is being reused (e.g. after switching accounts in the same browser tab). Make sure you're on the latest `chat-app.tsx`, which resets conversation state whenever the logged-in user changes.
- **Socket shows "offline" and never connects** — check `NEXT_PUBLIC_SOCKET_URL` in the frontend env matches where the backend is actually running, and that `FRONTEND_ORIGIN` in the backend `.env` matches your frontend's origin (CORS).
- **MongoDB connection errors on backend start** — confirm `MONGODB_URI` points to a running instance; `docker run -d -p 27017:27017 --name luxury-chat-mongo mongo:7` is the fastest way to get one locally.
