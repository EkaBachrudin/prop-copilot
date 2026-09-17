# Property Lead Management

A self-contained **property lead management** application. It combines classic property
inventory management (Properties → Blocks → Units) with a WhatsApp-first sales flow: an AI
agent talks to inbound leads, extracts and scores their requirements, and grounds its answers
in a RAG knowledge base built from listings and uploaded PDFs.

## Features

- **Authentication** — login / logout / current user, stateless JWT in an httpOnly cookie.
- **Property management** — CRUD for Properties → Blocks → Units, search, pagination, status
  filters, plus listing fields (price, property type).
- **WhatsApp conversations** — two-pane inbox with search, threads, manual replies as a
  consultant, test-mode customer simulation, and realtime updates over Socket.IO.
- **AI sales agent** — per-conversation agent on/off, automatic handoff to a human when a lead
  needs follow-up, and a safety net for handoff phrases.
- **Lead management** — AI-extracted lead data, a 0–100 score, `cold | warm | hot` status,
  next action, and per-lead agent toggle.
- **RAG knowledge base** — upload PDFs, semantic search, ingestion stats, and reindexing;
  listing inventory is embedded automatically.
- **WhatsApp Cloud API settings** — company/phone credentials, enable toggle, and a public
  Meta webhook for verification and inbound messages.
- **UI** — light/dark theme, responsive dashboard shell.

## Stack

| Layer | Stack |
| --- | --- |
| Backend | Node 20, TypeScript, Express 5, PostgreSQL (`pg`), Socket.IO, JWT (httpOnly cookie), bcrypt |
| AI service | Node 20, TypeScript, Express 5, LangChain, OpenAI, pgvector |
| Frontend | React 19, Vite 8, TypeScript, React Router 7, TanStack React Query 5, Socket.IO client, Tailwind CSS v4 |
| Database | PostgreSQL 16 + pgvector, custom SQL migration runner |

## Quick start (Docker)

Everything runs with a single command:

```bash
make up
```

This builds and starts four containers:

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| AI agent | http://localhost:5000 |
| Health check | http://localhost:4000/health |
| PostgreSQL | localhost:5432 |

Database migrations run automatically when the backend container starts.

**Default credentials:** `admin@example.com` / `Admin123`

### Configure the AI service

The `ai-agent` container needs an OpenAI key (for chat + embeddings). Before the first run:

```bash
cp property-management-be/.env.example property-management-be/.env
cp ai-agent/.env.example ai-agent/.env          # set OPENAI_API_KEY
cp .env.example .env                            # optional compose overrides
```

Then run `make up`, and `make backfill` to embed the seeded listings into the RAG vector
store. `WHATSAPP_API_ENABLED=false` (the default) keeps WhatsApp in **test mode**: messages
are mocked/simulated instead of sent through Meta.

## Make targets

```bash
make up               # build + start db, backend, ai-agent, frontend (default)
make down             # stop and remove containers
make restart          # down + up
make build            # build all images
make logs             # follow logs of all services
make ps               # container status
make migrate          # run pending migrations
make migrate-status   # show migration status
make migrate-rollback # show rollback instructions for the last migration
make seed             # seed/refresh the admin user
make psql             # open psql in the database
make be-shell         # shell into backend
make fe-shell         # shell into frontend
make agent-shell      # shell into ai-agent
make backfill         # rebuild the RAG vector store from listings + documents
make reindex          # alias for backfill
make reset-leads      # truncate leads, conversations and messages
make reset-agent      # restart ai-agent and re-enable agent_run for all conversations
make clean            # stop + delete volumes (wipes the database)
make help             # list all targets
```

## Layout

```
property-lead-management/
├── Makefile
├── docker-compose.yml
├── .env / .env.example
├── docs/
├── property-management-be/   # Express 5 + TypeScript API (auth, properties, conversations, leads, RAG proxy)
├── property-management-fe/   # React 19 + Vite SPA (dashboard, conversations, leads, knowledge base)
└── ai-agent/                 # RAG + AI sales agent (Express 5, LangChain, OpenAI, pgvector)
```

## API overview

Base path `/api/v1`. All routes require the `access_token` httpOnly cookie except
`POST /auth/login` and the public webhook.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/login` | Login (rate-limited) |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| GET | `/properties` | List properties (pagination/search/city) |
| GET | `/properties/:id` | Property detail + blocks |
| POST/PUT/DELETE | `/properties[/:id]` | Property CRUD |
| POST | `/properties/:propertyId/blocks` | Create block |
| PUT/DELETE | `/blocks/:id` | Update/delete block |
| GET/POST | `/blocks/:blockId/units` | List/create units |
| GET/PUT/DELETE | `/units/:id` | Unit detail/update/delete |
| GET | `/conversations` | List conversations |
| GET | `/conversations/:id` | Conversation detail |
| POST | `/conversations/create` | Create conversation |
| POST | `/conversations/update` | Update conversation (agent on/off, etc.) |
| POST | `/conversations/clear` | Clear conversation messages |
| POST | `/conversations/delete` | Delete conversation |
| GET | `/messages` | List messages (`conversation_id`) |
| POST | `/messages/send` | Send manual message as consultant |
| POST | `/messages/simulate` | Inject a customer message (test mode only) |
| GET | `/leads` | List leads (filter `status`, `search`) |
| PATCH | `/lead/:id/toggle-agent` | Toggle agent/handoff for a lead |
| GET | `/whatsapp/status` | WhatsApp integration status |
| GET | `/whatsapp/setup` | Read WhatsApp configuration |
| POST | `/whatsapp/setup` | Update WhatsApp configuration |
| POST | `/rag/upload` | Upload a PDF into the knowledge base |
| GET | `/rag/documents` | List knowledge-base documents |
| GET | `/rag/stats` | Knowledge-base stats |
| DELETE | `/rag/documents/:id` | Delete a document |
| POST | `/rag/search` | Semantic retrieval test |
| POST | `/rag/reindex` | Reindex listings + documents |
| GET | `/webhook/whatsapp` | Public Meta webhook verification |
| POST | `/webhook/whatsapp` | Public Meta inbound message webhook |

The backend also exposes a cookie-authenticated **Socket.IO** endpoint that emits
`message:new`, `conversation:updated`, and `conversation:new` events.

See [`docs/03-BACKEND.md`](./docs/03-BACKEND.md) for the full API reference and
[`docs/06-AI-LEAD-MANAGEMENT.md`](./docs/06-AI-LEAD-MANAGEMENT.md) for the AI pipeline.

## How the AI flow works

1. An inbound WhatsApp message hits `POST /api/v1/webhook/whatsapp` on the backend.
2. The backend normalizes it and calls the AI agent at `POST /message`.
3. The agent grounds its answer in the RAG vector store (listings + uploaded PDFs), extracts
   `lead_data`, and returns a reply with a score.
4. The backend upserts the lead (monotonic score, `cold | warm | hot` status), sends the reply
   through the WhatsApp Cloud API (mocked in test mode), and emits realtime events.
5. When handoff is detected the agent is disabled for that conversation until toggled back on
   (`PATCH /lead/:id/toggle-agent` or the Conversations/Leads UI).

**Scoring:** +20 per known field; `hot` ≥ 60, `warm` ≥ 40, otherwise `cold`.

## Environment

Each service reads its own `.env` (copy the matching `.env.example`):

| File | Key variables |
| --- | --- |
| `.env` (root) | `POSTGRES_*`, `APP_PORT`, `FE_PORT`, `AGENT_PORT`, `WHATSAPP_API_ENABLED` |
| `property-management-be/.env` | `NODE_ENV`, `APP_PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_TTL_SECONDS`, `DB_*`, `AI_AGENT_URL`, `WHATSAPP_API_ENABLED` |
| `ai-agent/.env` | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `AGENT_TOP_K`, `MAX_HISTORY_TURNS`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `DB_*` |
| `property-management-fe/.env` | `VITE_API_URL` (compose also injects `VITE_PROXY_TARGET`) |

## Database

Migrations live in `property-management-be/src/migrations` and run through a custom runner
tracked in `schema_migrations`. After the first `make up` the database contains:

- 1 user (`admin@example.com`)
- 2 properties (Brassia Garden, Grand Permata Residence)
- 6 blocks
- 74 units (mixed statuses, with listing price/property type)

Tables cover `users`, `properties`, `blocks`, `units`, `conversations`, `messages`, `leads`,
`documents`, and a singleton `settings` row. The `vector` extension is enabled and the RAG
embedding tables are created lazily by the AI agent.

## Documentation

Start at [`docs/README.md`](./docs/README.md). Note that `docs/01`–`docs/05` predate the AI
stack (they still describe the auth + property-only clone); `docs/06-AI-LEAD-MANAGEMENT.md`
documents the AI agent, RAG, WhatsApp, and lead-management implementation as it exists today.
