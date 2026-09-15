# 05 — Regeneration Prompt

Paste the block below into a coding agent (opencode, Claude Code, Cursor, etc.) in an
**empty directory** to regenerate the full Property Management project. The complete
source for every file is in [`03-BACKEND.md`](./03-BACKEND.md) and
[`04-FRONTEND.md`](./04-FRONTEND.md); the database in [`02-DATABASE.md`](./02-DATABASE.md).

---

## Master prompt

```text
Build a new, self-contained "Property Management" web application in this empty
directory. It must have ONLY two capabilities:

  1. Authentication: email + password login, logout, and "current user" using a JWT
     stored in an httpOnly cookie. No registration, no refresh tokens, no CSRF, no
     sessions table, no roles/RBAC.
  2. Property management: Properties -> Blocks -> Units, all managed through table UIs.

Do NOT include leads, pipeline/kanban, dashboard, analytics, reminders, WhatsApp,
subscriptions, user administration, settings, or siteplan upload.

Follow the detailed specification in the documentation set at
<PATH_TO_DOCS>/04-property-management-clone/ (files 01-OVERVIEW.md through
04-FRONTEND.md). Use those documents as the source of truth for the exact file
contents. In particular:
  - 02-DATABASE.md  -> schema DDL, seeds, migration runner.
  - 03-BACKEND.md   -> every backend file and the API reference.
  - 04-FRONTEND.md  -> every frontend file and the UI.

=== Repository layout (create exactly this) ===

property-management/
├── property-management-be/     # Express 5 + TypeScript + pg
├── property-management-fe/     # React 19 + Vite 8 + TypeScript + Tailwind v4
└── README.md

=== Backend (property-management-be) ===

Stack: Node 20, TypeScript ^5.9, Express ^5.2, pg ^8.16, jsonwebtoken ^9.0,
bcryptjs ^3.0, cookie-parser ^1.4, helmet ^8.1, cors ^2.8, compression ^1.8,
morgan ^1.10, express-rate-limit ^8.2, dotenv ^17.2. Dev: ts-node, nodemon, eslint,
prettier, @types/*.

Create these source files (full contents in 03-BACKEND.md):

  src/index.ts
  src/config/database.ts
  src/types/index.ts
  src/utils/AppError.ts
  src/utils/naturalSort.ts
  src/utils/migrate.ts
  src/utils/seed.ts
  src/utils/auth/jwt.ts
  src/utils/auth/password.ts
  src/middleware/auth/authenticate.ts
  src/middleware/errorHandler.ts
  src/middleware/rateLimiter.ts
  src/middleware/requestLogger.ts
  src/middleware/index.ts
  src/services/authService.ts
  src/services/propertiesService.ts
  src/services/blocksService.ts
  src/services/unitsService.ts
  src/controllers/authController.ts
  src/controllers/propertiesController.ts
  src/controllers/blocksController.ts
  src/controllers/unitsController.ts
  src/routes/authRoutes.ts
  src/routes/propertiesRoutes.ts
  src/routes/blocksRoutes.ts
  src/routes/unitsRoutes.ts
  src/migrations/001_schema.sql
  src/migrations/002_seed_users.sql
  src/migrations/003_seed_properties.sql
  src/migrations/004_seed_blocks.sql
  src/migrations/005_seed_units.sql

Config files: package.json, tsconfig.json, nodemon.json, .eslintrc.json,
.prettierrc.json, .env.example.

Key backend rules:
  - Base path /api/v1. JSON only. No multipart.
  - Auth: POST /auth/login (public, rate-limited), POST /auth/logout,
    GET /auth/me. JWT HS256, TTL from JWT_TTL_SECONDS (default 28800). Set/clear an
    httpOnly, SameSite=strict, Secure-in-production cookie named access_token.
  - All property/block/unit routes require the authenticate middleware.
  - Unit status is a manually managed enum: available | reserved | booked | sold
    (default available), settable on create and update and validated.
  - Properties have no assigned_to/owner column.
  - Success envelope: { success: true, message?, data }
  - Error envelope: { success: false, error: { code, message, details? } }
    Codes: VALIDATION_ERROR(400), INVALID_CREDENTIALS(401), UNAUTHORIZED(401),
    ACCOUNT_INACTIVE(403), NOT_FOUND(404), CONFLICT(409), RATE_LIMITED(429),
    INTERNAL_ERROR(500).
  - Property list paginates (page, limit<=50, search, city) and returns
    total_blocks/total_units via LEFT JOIN aggregates.
  - Units list paginates (page, limit<=100, status, search), ordered with natural sort.
  - Migrations: read sorted *.sql from src/migrations, track in schema_migrations,
    each file in its own transaction. CLI: run | status | rollback.
  - Seed one user: admin@example.com / Admin123.

=== Frontend (property-management-fe) ===

Stack: React ^19.2, Vite ^8.1, TypeScript ~6.0, react-router-dom ^7.18,
@tanstack/react-query ^5.101, tailwindcss ^4.3 + @tailwindcss/postcss, lucide-react,
clsx, tailwind-merge, @fontsource-variable/geist + geist-mono, oxlint. Do NOT add
recharts, vite-plugin-pwa, or @fontsource/inter.

Create these source files (full contents in 04-FRONTEND.md):

  src/main.tsx
  src/App.tsx
  src/index.css
  src/vite-env.d.ts
  src/lib/types.ts
  src/lib/utils.ts
  src/lib/api.ts
  src/providers/QueryProvider.tsx
  src/contexts/AuthContext.tsx
  src/contexts/ToastContext.tsx
  src/components/ProtectedRoute.tsx (+ .css)
  src/components/DocumentTitle.tsx
  src/components/layout/DashboardLayout.tsx (+ .css)
  src/components/layout/Header.tsx (+ .css)
  src/components/layout/Sidebar.tsx (+ .css)
  src/components/ui/Button.tsx (+ .css)
  src/components/ui/Input.tsx (+ .css)
  src/components/ui/Textarea.tsx (+ .css)
  src/components/ui/Select.tsx (+ .css)
  src/components/ui/Badge.tsx (+ .css)
  src/components/ui/Card.tsx (+ .css)
  src/components/ui/Toast.tsx (+ .css)
  src/components/ui/ConfirmDialog.tsx
  src/components/properties/PropertyFormModal.tsx
  src/components/properties/BlockFormModal.tsx
  src/components/properties/UnitFormModal.tsx
  src/hooks/useLockBodyScroll.ts
  src/hooks/useDebounce.ts
  src/hooks/useProperties.ts
  src/hooks/usePropertyDetail.ts
  src/hooks/useBlocks.ts
  src/hooks/useUnits.ts
  src/pages/LoginPage.tsx (+ .css)
  src/pages/PropertiesPage.tsx
  src/pages/PropertyDetailPage.tsx

Config files: package.json, vite.config.ts (react plugin, "@" -> ./src alias,
dev server port 3000, proxy /api -> http://localhost:4000), postcss.config.mjs,
tsconfig.json + tsconfig.app.json + tsconfig.node.json, .oxlintrc.json, index.html,
.env.example (VITE_API_URL=http://localhost:4000).

Key frontend rules:
  - Routes: /login (public), /properties (protected), /properties/:id (protected);
    / and * redirect to /properties.
  - API client uses fetch with credentials:'include'; on 401 redirect to /login.
    Read the access token only from the cookie (never JS storage).
  - Tailwind v4: src/index.css defines :root tokens, an @theme inline mapping, base
    styles, and an @layer components block containing .data-table*, .status-badge*,
    .pagination*, .modal*, .form-grid, .page-toolbar, .content-card, .empty-state.
    Every other component .css file MUST start with @reference "<relative>/index.css";
    and use @apply with the theme tokens.
  - Tables are native <table className="data-table">. Properties page: columns
    Name, City, Land Area, Blocks, Units, Actions, with search + server pagination.
    Property detail: property form + Blocks table (Name, Units, Actions) + a Units
    table for the selected block (Unit, Land Area, Status badge, Actions) with status
    filter, search, and server pagination.
  - React Query keys: ['properties', params], ['propertyDetail', id], ['units', blockId, params].
    Mutations invalidate the relevant keys.
  - Use lucide-react icons; toast notifications via ToastContext.

=== Database ===

PostgreSQL 13+. Tables: users, properties, blocks, units, schema_migrations.
  users(id, full_name, email unique, phone, password_hash, is_active, created_at, updated_at)
  properties(id, name, city, land_area, address, description, is_active, created_at, updated_at)
  blocks(id, property_id fk cascade, name, is_active, created_at, updated_at,
         unique(property_id, name))
  units(id, block_id fk cascade, name, land_area, status check, created_at, updated_at,
        unique(block_id, name))
Use gen_random_uuid() defaults, TIMESTAMPTZ, and the indexes listed in 02-DATABASE.md.
Seed 2 properties, 6 blocks, 74 units, 1 user.

=== Acceptance criteria ===

1. `cd property-management-be && npm install && npm run type-check` passes.
2. `npm run db:migrate` applies all 5 migrations against a fresh DB.
3. `npm run dev` serves /health 200 and login works with admin@example.com / Admin123.
4. `cd property-management-fe && npm install && npm run build` passes (tsc + vite).
5. Logged in, /properties shows a table; create/edit/delete a property updates it.
6. /properties/:id shows the property form, a Blocks table, and a Units table with
   status filter, search and pagination; block and unit CRUD works.

Generate all files completely — no placeholders or TODOs. Then run the type-check,
lint, and build commands above and fix any errors until they pass.
```

---

## How to use it

1. Create a fresh directory: `mkdir property-management && cd property-management`.
2. Replace `<PATH_TO_DOCS>` with the absolute path to the folder containing this file
   (e.g. `/home/you/sales-force/docs`), or paste the relevant contents of
   `02-DATABASE.md`, `03-BACKEND.md`, and `04-FRONTEND.md` into the prompt.
3. Run the prompt with your coding agent.
4. Verify with the acceptance criteria in §"Acceptance criteria".
