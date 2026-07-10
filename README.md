# Luxury Product Support Chat App

This workspace contains the Phase 1 frontend for a luxury retail support chat experience.

## Features

- Customer landing experience with premium product cards
- Dedicated conversation threads per customer-product pair
- Agent inbox with conversation lists and thread details
- Role-based auth entry flow for customer and agent personas
- Mocked Socket.IO wiring placeholders for the later backend integration

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Notes

- Authentication is currently mocked in local storage for the frontend-only demo.
- Socket.IO is initialized with a placeholder endpoint and will be replaced by the NestJS backend in Phase 2.
- The UI is designed to be fully navigable and demonstrable before backend work begins.
