# event-hub-web

Admin and Organizer dashboard for [EventHub](https://github.com/nguyen-duong-tien-phat/event-hub-DotNet): events and posters, tickets, bookings, sales numbers and users.

React + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query and Table, React Hook Form + Zod. It talks to the EventHub API over HTTP only.

## Run it

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
