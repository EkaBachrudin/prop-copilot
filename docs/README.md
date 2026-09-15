# Property Management Clone — Documentation

Complete blueprint and source for regenerating a **standalone Property Management
application** extracted from the Sales Force Automation project. The clone keeps only
**authentication** and **property management** (Properties → Blocks → Units) with
**table UIs**, and removes every other feature.

> **Scope:** login / logout / current-user, plus CRUD for properties, blocks, and units.
> **Not included:** leads, kanban/pipeline, dashboard, analytics, reminders, WhatsApp,
> subscriptions, user administration, settings, and siteplan upload.

## Tech stack

| Layer | Stack |
| --- | --- |
| Backend | Node 20, TypeScript, Express 5, PostgreSQL (`pg`), JWT (httpOnly cookie), bcrypt |
| Frontend | React 19, Vite 8, TypeScript, React Router 7, TanStack React Query 5, Tailwind CSS v4 |
| Database | PostgreSQL 16, custom SQL migration runner |

## Documents

| # | Document | Contents |
| --- | --- | --- |
| 1 | [01-OVERVIEW.md](./01-OVERVIEW.md) | Scope, design decisions, stack, folder layout, env vars, runtime architecture. |
| 2 | [02-DATABASE.md](./02-DATABASE.md) | ERD, full DDL, indexes, seed data, migration runner + seeder source. |
| 3 | [03-BACKEND.md](./03-BACKEND.md) | Every backend file (configs, middleware, utils, routes, controllers, services) + API reference + error codes. |
| 4 | [04-FRONTEND.md](./04-FRONTEND.md) | Every frontend file (configs, design system, API client, contexts, hooks, UI kit, layout, modals, table pages). |
| 5 | [05-REGENERATION-PROMPT.md](./05-REGENERATION-PROMPT.md) | A single copy-paste master prompt that regenerates the whole project in a fresh directory. |

## Regenerate the project

**Fastest path:** feed the master prompt in
[05-REGENERATION-PROMPT.md](./05-REGENERATION-PROMPT.md) to a coding agent inside an
empty folder.

**Manual path:** follow documents 02 → 03 → 04 in order, creating each file, then run:

```bash
# Backend
cd property-management-be
cp .env.example .env             # set DB_* and JWT_SECRET
npm install
npm run db:migrate
npm run dev                      # http://localhost:4000

# Frontend (new terminal)
cd property-management-fe
cp .env.example .env
npm install
npm run dev                      # http://localhost:3000
```

**Default credentials:** `admin@example.com` / `Admin123`

## Default data

After migrations the database contains:

- 1 user (`admin@example.com`)
- 2 properties (Brassia Garden, Grand Permata Residence)
- 6 blocks
- 74 units (mixed statuses to exercise the table filters)

## Key decisions

- **Single user type** — no roles, RBAC, ownership, or subscriptions.
- **Stateless auth** — one JWT in an httpOnly cookie; logout clears the cookie.
- **Manual unit status** — `available | reserved | booked | sold`, set via the API
  (the original derived it from lead status via a trigger; leads are removed here).
- **Standardized errors** — `{ success:false, error:{ code, message, details? } }`.

## Relationship to the parent project

This documentation was derived from `sales-force-be` and `sales-force-fe-react` but is
fully self-contained. See the parent index at [`../README.md`](../README.md).
