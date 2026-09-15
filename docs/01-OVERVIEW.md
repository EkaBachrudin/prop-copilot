# 01 — Overview & Architecture

This document is the entry point for regenerating a **standalone Property Management
application** derived from the Sales Force Automation project. It describes scope, the
technology stack, the folder layout, environment variables, and the runtime architecture.

> **Goal:** a self-contained app with **only two capabilities**:
> 1. **Authentication** (login / logout / current user).
> 2. **Property management** (Properties → Blocks → Units) rendered with **table UIs**.

Everything else in the original project (leads, kanban/pipeline, dashboard, analytics,
subscriptions, user administration, reminders, WhatsApp, siteplan upload) is **removed**.

---

## 1. Scope

### 1.1 In scope

| Area | Details |
| --- | --- |
| Auth | Email + password login, JWT stored in an httpOnly cookie, `/me`, logout. |
| Properties | CRUD (list with pagination/search/city filter, detail, create, update, delete). |
| Blocks | Create / rename / delete, nested under a property. |
| Units | List (paginated/filterable by status/search), create, update, delete. |
| UI | Login page, Properties table page, Property detail page with Blocks table + Units table. |
| Database | PostgreSQL with a migration runner and seed data. |

### 1.2 Explicitly out of scope

- User registration (public sign-up) — users are seeded.
- Roles / RBAC / permissions — there is a **single user type**; any logged-in user can do everything.
- Subscriptions and the `subscriptionCheck` middleware.
- Leads, pipeline/kanban, dashboard, analytics, reminders, WhatsApp, exports.
- Siteplan SVG upload and static `/uploads` serving.
- Refresh tokens, CSRF middleware, `user_sessions`, `revoked_tokens`.
- PWA install banners (PWA manifest is optional and simplified).

### 1.3 Deliberate design changes vs. the original

These changes make the clone coherent once the removed features are gone:

1. **Unit status is a manually managed field.**
   In the original, `units.status` is derived from a PostgreSQL trigger that reacts to
   `leads.status`. Because leads are removed, the clone lets the client set `status`
   directly on create/update, validated against
   `available | reserved | booked | sold` (default `available`).

2. **No property ownership column.**
   The original had `properties.assigned_to → users.id`. With a single user type and no
   RBAC there is no ownership concept, so the column is dropped.

3. **No refresh/CSRF/session tables.**
   Auth is a single JWT with a configurable TTL (default 8 hours). Logout simply clears
   the cookie. This keeps the security model small and stateless.

4. **Standardized error envelope.**
   The original mixed `{status,message}` and `{success,error}` shapes. Every error in the
   clone is `{ success:false, error:{ code, message, details? } }` (see `03-BACKEND.md`).

---

## 2. Technology stack

### 2.1 Backend

| Concern | Choice | Version |
| --- | --- | --- |
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | ^5.9 |
| Web framework | Express | ^5.2 |
| Database driver | `pg` | ^8.16 |
| Auth tokens | `jsonwebtoken` | ^9.0 |
| Password hashing | `bcryptjs` | ^3.0 |
| Cookies | `cookie-parser` | ^1.4 |
| Security headers | `helmet` | ^8.1 |
| CORS | `cors` | ^2.8 |
| Compression | `compression` | ^1.8 |
| Logging | `morgan` | ^1.10 |
| Rate limiting | `express-rate-limit` | ^8.2 |
| Dev runner | `nodemon` + `ts-node` | ^3.1 / ^10.5 |
| Linting | ESLint + Prettier | ^9 / ^3 |

### 2.2 Frontend

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | React | ^19.2 |
| Build tool | Vite | ^8.1 |
| Language | TypeScript | ~6.0 |
| Routing | `react-router-dom` | ^7.18 |
| Server state | `@tanstack/react-query` | ^5.101 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | ^4.3 |
| Icons | `lucide-react` | ^1.21 |
| Class utilities | `clsx` + `tailwind-merge` | ^2.1 / ^3.6 |
| Fonts | Geist Variable + Geist Mono | ^5.2 |
| Linting | `oxlint` | ^1.69 |

### 2.3 Database

- PostgreSQL 16.
- UUID primary keys generated with `gen_random_uuid()`.
- A custom SQL migration runner tracked in `schema_migrations`.

---

## 3. Repository layout

The regenerated project is a small monorepo with a backend, a frontend, and a shared PostgreSQL database.

```
property-management/
├── property-management-be/              # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/database.ts           # pg Pool + connection test
│   │   ├── middleware/
│   │   │   ├── auth/authenticate.ts      # JWT cookie guard
│   │   │   ├── errorHandler.ts           # AppError → JSON
│   │   │   ├── rateLimiter.ts            # auth + general limiters
│   │   │   └── requestLogger.ts
│   │   ├── controllers/                 # HTTP layer per module
│   │   │   ├── authController.ts
│   │   │   ├── propertiesController.ts
│   │   │   ├── blocksController.ts
│   │   │   └── unitsController.ts
│   │   ├── services/                    # SQL + business rules
│   │   │   ├── authService.ts
│   │   │   ├── propertiesService.ts
│   │   │   ├── blocksService.ts
│   │   │   └── unitsService.ts
│   │   ├── routes/                      # Express routers
│   │   │   ├── authRoutes.ts
│   │   │   ├── propertiesRoutes.ts
│   │   │   ├── blocksRoutes.ts
│   │   │   └── unitsRoutes.ts
│   │   ├── types/index.ts               # Shared DTOs & domain types
│   │   ├── utils/
│   │   │   ├── AppError.ts
│   │   │   ├── migrate.ts               # migration CLI
│   │   │   ├── seed.ts                  # seed CLI (bcrypt users)
│   │   │   ├── naturalSort.ts
│   │   │   └── auth/{jwt.ts,password.ts}
│   │   ├── migrations/                  # *.sql, ordered by filename
│   │   │   ├── 001_schema.sql
│   │   │   ├── 002_seed_users.sql
│   │   │   ├── 003_seed_properties.sql
│   │   │   ├── 004_seed_blocks.sql
│   │   │   └── 005_seed_units.sql
│   │   └── index.ts                     # App bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── .prettierrc.json
│   ├── nodemon.json
│   └── .env.example
│
├── property-management-fe/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/{DashboardLayout,Header,Sidebar}.tsx
│   │   │   ├── ui/{Button,Input,Textarea,Select,Badge,Card,Toast,ConfirmDialog}.tsx
│   │   │   ├── properties/{PropertyFormModal,BlockFormModal,UnitFormModal}.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── DocumentTitle.tsx
│   │   ├── contexts/{AuthContext,ToastContext}.tsx
│   │   ├── providers/QueryProvider.tsx
│   │   ├── hooks/{useProperties,usePropertyDetail,useBlocks,useUnits,useDebounce,useLockBodyScroll}.ts
│   │   ├── lib/{api.ts,types.ts,utils.ts}
│   │   ├── pages/{LoginPage,PropertiesPage,PropertyDetailPage}.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   ├── .oxlintrc.json
│   └── .env.example
│
└── README.md
```

---

## 4. Runtime architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Browser (React SPA)     │        │  API (Express)           │
│  property-management-fe  │        │  property-management-be  │
│                          │        │                          │
│  React Query ────────────┼──fetch─┤  /api/v1/auth/*          │
│  credentials: include    │  JSON  │  /api/v1/properties      │
│  (httpOnly JWT cookie)   │◄───────┤  /api/v1/blocks/*        │
└──────────────────────────┘        │  /api/v1/units/*         │
                                    └────────────┬─────────────┘
                                                 │ pg Pool
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  PostgreSQL 16           │
                                    │  users/properties/blocks │
                                    │  /units                  │
                                    └──────────────────────────┘
```

- The SPA never stores the JWT in JavaScript; the API sets an `httpOnly` cookie on
  login. All fetches use `credentials: 'include'`.
- The Vite dev server proxies `/api` to the backend (port 4000), so browser requests
  stay same-origin during development.
- A single JWT TTL (default 8h) is used; on `401` the SPA redirects to `/login`.

---

## 5. Environment variables

### 5.1 Backend (`property-management-be/.env`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `production` enables secure cookies and hides error stacks. |
| `APP_PORT` | No | `4000` | HTTP port the API listens on. |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowed origins. |
| `JWT_SECRET` | **Yes** | — | HS256 signing secret (min 32 chars in production). |
| `JWT_TTL_SECONDS` | No | `28800` | Token and cookie lifetime in seconds (8h). |
| `DB_HOST` | No | `localhost` | PostgreSQL host. |
| `DB_PORT` | No | `5432` | PostgreSQL port. |
| `DB_NAME` | No | `property_management` | Database name. |
| `DB_USER` | No | `postgres` | Database user. |
| `DB_PASSWORD` | No | `postgres` | Database password. |

### 5.2 Frontend (`property-management-fe/.env`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `http://localhost:4000` | Base URL of the API (no trailing slash). |

---

## 6. Ports

| Service | Dev port |
| --- | --- |
| Frontend (Vite dev server) | 3000 |
| Backend API | 4000 |
| PostgreSQL | 5432 |

---

## 7. Cross-references

- Database schema and migrations → [`02-DATABASE.md`](./02-DATABASE.md)
- Backend source and API reference → [`03-BACKEND.md`](./03-BACKEND.md)
- Frontend source and UI reference → [`04-FRONTEND.md`](./04-FRONTEND.md)
- Copy-paste regeneration prompt → [`05-REGENERATION-PROMPT.md`](./05-REGENERATION-PROMPT.md)
