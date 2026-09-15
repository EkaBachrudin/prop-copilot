# Property Lead / Property Management

Standalone **Property Management** application generated from the documentation in
[`docs/`](./docs). It ships only two capabilities: **authentication** and **property
management** (Properties → Blocks → Units).

## Stack

| Layer | Stack |
| --- | --- |
| Backend | Node 20, TypeScript, Express 5, PostgreSQL (`pg`), JWT (httpOnly cookie), bcrypt |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4 *(scaffold only — UI not built yet)* |
| Database | PostgreSQL 16, custom SQL migration runner |

## Quick start (Docker)

Everything runs with a single command:

```bash
make up
```

That builds and starts three containers:

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |
| PostgreSQL | localhost:5432 |

Database migrations run automatically when the backend container starts.

**Default credentials:** `admin@example.com` / `Admin123`

## Make targets

```bash
make up               # build + start db, backend, frontend (default)
make down             # stop and remove containers
make restart          # down + up
make logs             # follow logs of all services
make ps               # container status
make migrate          # run pending migrations
make migrate-status   # show migration status
make seed             # seed/refresh the admin user
make psql             # open psql in the database
make be-shell         # shell into backend
make fe-shell         # shell into frontend
make clean            # stop + delete volumes (wipes the database)
make help             # list all targets
```

Configuration lives in the root [`.env`](./.env) (copy of `.env.example`).

## Layout

```
property-lead-management/
├── Makefile
├── docker-compose.yml
├── .env / .env.example
├── docs/
├── property-management-be/   # Express 5 + TypeScript API (complete)
└── property-management-fe/   # React + Vite scaffold (no UI yet)
```

## API overview

Base path `/api/v1`. All routes except `POST /auth/login` require the `access_token`
httpOnly cookie.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| GET | `/properties` | List properties (pagination/search/city) |
| GET | `/properties/:id` | Property detail + blocks |
| POST/PUT/DELETE | `/properties[/:id]` | Property CRUD |
| POST | `/properties/:propertyId/blocks` | Create block |
| PUT/DELETE | `/blocks/:id` | Update/delete block |
| GET/POST | `/blocks/:blockId/units` | List/create units |
| GET/PUT/DELETE | `/units/:id` | Unit detail/update/delete |

See [`docs/03-BACKEND.md`](./docs/03-BACKEND.md) for the full API reference.

## Next steps

The frontend is intentionally a scaffold (configs + placeholder page). The UI described in
[`docs/04-FRONTEND.md`](./docs/04-FRONTEND.md) will be implemented later.
