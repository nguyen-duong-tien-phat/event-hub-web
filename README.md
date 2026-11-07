# event-hub-web

Admin and Organizer dashboard for [EventHub](https://github.com/nguyen-duong-tien-phat/event-hub-DotNet): events and posters, tickets, bookings, sales numbers and users.

React + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query, React Hook Form + Zod. It talks to the EventHub API over HTTP only.

## What it does

- **Events:** a searchable list (category, sort, organizer filter for admins), create and edit with a poster uploaded straight to storage, delete. An event page shows sales numbers, ticket types, who holds a ticket and who got in, and its bookings.
- **Bookings:** the bookings of all events or one, filtered by status. A booking shows each ticket's QR, its short code and whether it was used; a booking with a used ticket cannot be cancelled, any other can (a paid one is refunded).
- **Users (admin):** search, create with a role, change role, block or unblock, and a user's page: an organizer's events and sales, an attendee's booking history.
- **Everyone:** My profile, a dark theme, a collapsible sidebar, copy buttons on ids, codes and emails. The session survives new tabs and restarts.

An Organizer only ever sees their own events and bookings.

## Run it

0. Use Node 22 (`nvm use 22`).
1. Start the API (see its README): `docker compose up -d postgres redis mailpit floci`, then run it from `EventHub.API/` on port 8080.
2. `cp .env.example .env.local` if the API is not at `http://localhost:8080`.
3. `npm install`, then `npm run dev` and open http://localhost:5173.

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 5173 (the origin the API allows by default) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Oxlint |
| `npm test` | Vitest |

Working notes for contributors (and Claude Code) are in [CLAUDE.md](CLAUDE.md).
