# 06 — AI Agent & Lead Management

Dokumen ini menjelaskan **implementasi aktual** fitur AI agent, RAG knowledge base, dan
manajemen lead/percakapan WhatsApp pada project ini. Dokumen ini melengkapi
[01](./01-OVERVIEW.md)–[05](./05-REGENERATION-PROMPT.md) yang hanya membahas auth dan
CRUD properti/blok/unit.

> **Referensi kode utama**
> - Service AI: [`ai-agent/`](../ai-agent) (Express 5 + LangChain + pgvector)
> - Integrasi backend: [`property-management-be/src/lib/agentPipeline.ts`](../property-management-be/src/lib/agentPipeline.ts),
>   [`agentClient.ts`](../property-management-be/src/lib/agentClient.ts),
>   [`ragAdminService.ts`](../property-management-be/src/services/ragAdminService.ts)
> - UI: halaman Conversations, Leads, Knowledge Base, Settings, WhatsApp Settings di
>   [`property-management-fe/src/pages`](../property-management-fe/src/pages)

---

## 1. Ringkasan & Arsitektur Runtime

Sistem berjalan sebagai empat container yang diorkestrasi `docker-compose.yml`:

| Service | Container | Stack | Port (host → container) |
| --- | --- | --- | --- |
| `db` | `pm_db` | PostgreSQL 16 + `pgvector/pgvector:pg16` | `5432 → 5432` |
| `backend` | `pm_backend` | Node 20, TypeScript, Express 5, Socket.IO | `4000 → 4000` |
| `ai-agent` | `pm_agent` | Node 20, TypeScript, Express 5, LangChain, OpenAI | `5000 → 8080` |
| `frontend` | `pm_frontend` | React 19, Vite, TanStack Query, Socket.IO client | `3000 → 3000` |

Semua service terhubung ke network bridge `pm_net`. `backend` dan `ai-agent`
**berbagi database PostgreSQL yang sama**: agent membaca listing dari tabel
`properties/blocks/units` dan menyimpan sesi di `conversations.agent_state`.

```
WhatsApp (Meta Cloud API)
        │  webhook  POST /api/v1/webhook/whatsapp
        ▼
backend (Express 5 · pm_backend :4000)
  ├─ agentPipeline.handleIncomingMessage
  └─ Socket.IO realtime
        │  HTTP  POST /message  (AI_AGENT_URL)
        ▼
ai-agent (Express 5 · pm_agent :8080)
  ├─ /message  /reset
  └─ /api/rag/*  (LangChain + OpenAI)
        │  pg + pgvector
        ▼
PostgreSQL 16 + pgvector
  properties · blocks · units · conversations
  messages · leads · documents · settings · rag_embeddings
        ▲
        │  REST + WebSocket
frontend (React 19 · pm_frontend :3000)
```

### 1.1 Alur end-to-end satu pesan

1. Pelanggan mengirim pesan WhatsApp → Meta memanggil `POST /api/v1/webhook/whatsapp`.
2. `receiveWebhookController` menormalkan teks dan memanggil `handleIncomingMessage`.
3. `agentPipeline` menyimpan pesan masuk, lalu memanggil `ai-agent` via
   `POST /message`.
4. `ai-agent` merakit konteks (data lead yang sudah diketahui, area tersedia, katalog
   properti dari PostgreSQL, knowledge base dari pgvector), memanggil LLM, dan
   mengembalikan JSON `AgentResult`.
5. Backend meng-`upsert` lead (hanya untuk `user_type = "buyer"`), mengirim balasan
   melalui WhatsApp Cloud API, dan memancarkan event Socket.IO.
6. Bila `needs_human_followup = true`, backend menonaktifkan agent untuk percakapan itu
   (`conversations.agent_run = false`) sampai diaktifkan manual.

> **Penting — perbedaan dari dokumen lama:** implementasi ini memakai **Express 5**
> (bukan Next.js), **PostgreSQL + pgvector** (bukan MongoDB + ChromaDB), dan session
> dipersist di tabel `conversations` (bukan `agent_state` MongoDB).

---

## 2. Data Model (migrasi 006–013)

Fitur AI/lead management menambahkan migrasi berikut ke `property-management-be/src/migrations`:

| Migrasi | File | Isi |
| --- | --- | --- |
| 006 | `006_pgvector.sql` | `CREATE EXTENSION IF NOT EXISTS vector`. Tabel embedding dibuat lazy oleh `PGVectorStore`. |
| 007 | `007_units_listing_fields.sql` | Kolom `units.price NUMERIC(15,2)` dan `units.property_type`, constraint tipe (`Rumah, Ruko, Tanah, Apartemen, Komersial, Villa`), plus index `price` dan `property_type`. |
| 008 | `008_documents.sql` | Tabel `documents` (blob PDF + metadata) untuk knowledge base non-inventory. |
| 009 | `009_conversations.sql` | Tabel `conversations` — satu baris per nomor telepon; menyimpan `agent_state JSONB`, `agent_run`, `unread_count`, `user_type`. |
| 010 | `010_messages.sql` | Tabel `messages` — pesan WhatsApp individual; `whatsapp_message_id` UNIQUE sebagai kunci idempotensi. |
| 011 | `011_leads.sql` | Tabel `leads` — satu lead per percakapan (`conversation_id` UNIQUE), menyimpan `lead_data JSONB`, `lead_score`, `lead_status`, `needs_human_followup`, `next_action`. |
| 012 | `012_settings.sql` | Singleton `settings` (id = 1) — kredensial WhatsApp Cloud API, toggle `whatsapp_enabled`, `company_name`. Bootstrap satu baris. |
| 013 | `013_seed_listings.sql` | Mengisi `property_type` + `price` unit seed agar listing RAG realistis (Brassia Garden = Rumah, Grand Permata Residence = Ruko). |

Relasi inti:

```
properties 1─┬─* blocks 1─* units        (listing yang dijual agent)
             └─* conversations ─┬─* messages
                                 └─1 leads
documents                                  (PDF knowledge base)
rag_embeddings / rag_collections           (dibuat lazy oleh PGVectorStore)
settings (singleton id=1)
```

Status lead: `new | cold | warm | hot`. `lead_status` dihitung server-side dan hanya
pernah naik (monotonik).

---

## 3. Backend — Webhook WhatsApp & Agent Pipeline

### 3.1 Webhook WhatsApp

File: [`webhookController.ts`](../property-management-be/src/controllers/webhookController.ts),
routing di [`webhookRoutes.ts`](../property-management-be/src/routes/webhookRoutes.ts).
Route ini didaftarkan **sebelum** `generalLimiter` karena Meta melakukan retry.

| Method | Path | Handler |
| --- | --- | --- |
| GET | `/api/v1/webhook/whatsapp` | `verifyWebhookController` — Meta verification (`hub.mode=subscribe` + `hub.verify_token` harus sama dengan `settings.whatsapp_verify_token`). Mengembalikan `hub.challenge` atau `403`. |
| POST | `/api/v1/webhook/whatsapp` | `receiveWebhookController` — memproses event pesan. |

`receiveWebhookController`:

1. Hanya menerima `body.object === "whatsapp_business_account"` (selain itu `404`).
2. Menyaring event berdasarkan `metadata.phone_number_id` terhadap `settings.whatsapp_phone_number_id`.
3. Menormalkan `text`, `button`, dan `interactive` (`button_reply` / `list_reply`) menjadi teks.
4. Memanggil `handleIncomingMessage({ phone, name, text, whatsappMessageId, timestamp })`.
5. Selalu membalas `200 { status: "EVENT_RECEIVED" }` (error di-log, tidak dibocorkan ke Meta).

### 3.2 `handleIncomingMessage()` — pipeline inti

File: [`agentPipeline.ts`](../property-management-be/src/lib/agentPipeline.ts). Dipakai
bersama oleh webhook dan endpoint simulasi.

1. `findOrCreateConversation` — buat percakapan bila belum ada; emit `conversation:new`.
2. **Idempotensi** — bila `whatsapp_message_id` sudah ada, lewati (`skipped: true`).
3. Simpan pesan masuk (`direction: "incoming"`, `sender_type: "customer"`) dan emit
   `message:new` + `conversation:updated`.
4. Jika `conversation.agent_run === false` → jalur **bypass**: kirim satu closing bila
   pesan keluar terakhir belum memuat frasa handoff; LLM tidak dipanggil sama sekali.
5. `callAgent()` — `POST http://ai-agent:8080/message`. Bila agent tidak terjangkau,
   balasan dilewati (mengembalikan `replyMessage: null`).
6. Sinkronkan `conversation.user_type` bila berubah (emit `conversation:updated`).
7. `upsertLeadIfBuyer()` — hanya bila `user_type === "buyer"`.
8. Jika `needs_human_followup` → set `agent_run = false` (auto-disable) dan emit.
9. `deliverReply()` — terapkan safety net L3, kirim via WhatsApp, simpan pesan keluar,
   dan emit event.

### 3.3 Safety net L3 (`deliverReply`)

Dua-duanya ada di `agentPipeline.ts` dan merupakan duplikasi sengaja dari helper agent
(pertahanan berlapis di dua proses berbeda):

- `needs_human_followup = true` tetapi teks belum memuat frasa `"menghubungi anda"` →
  tambahkan `CLOSING_LINE` (`"Agen kami akan menghubungi Anda."`).
- `needs_human_followup = false` tetapi teks memuat frasa handoff → frasa dihapus
  dengan `stripHandoffPhrase()` sebelum dikirim.

### 3.4 Upsert lead (monotonik)

`upsertLeadIfBuyer()`:

- Hanya menyimpan bila `user_type === "buyer"` — **bukan** berdasarkan status
  `hot/warm/cold`. Lead dengan status `cold` tetap disimpan.
- **Monotonik**: bila skor baru < skor lama, update dilewati (log "Lead score did not
  increase").
- `lead_data` di-merge field-per-field: nilai agent → nilai lama lead → nama percakapan.
- `upsertLead()` memakai `ON CONFLICT (conversation_id) DO UPDATE` sehingga satu lead per
  percakapan.

### 3.5 Auto-disable & toggle agent

- Handoff otomatis mematikan agent (`agent_run = false`).
- `PATCH /api/v1/lead/:id/toggle-agent` (`toggleLeadAgentController`) membalik
  `needs_human_followup` lead dan menyetel `conversations.agent_run` agar konsisten. Bila
  agent diaktifkan kembali, `resetAgentSession(phone)` dijalankan untuk membersihkan sesi
  agent.
- `make reset-agent` me-restart container agent dan mengembalikan `agent_run = true` untuk
  semua percakapan.

### 3.6 Klien agent & proxy RAG

- [`agentClient.ts`](../property-management-be/src/lib/agentClient.ts): `callAgent()`
  (`POST /message`) dan `resetAgentSession()` (`POST /reset`). Base URL dari env
  `AI_AGENT_URL` (default `http://127.0.0.1:8080`).
- [`ragAdminService.ts`](../property-management-be/src/services/ragAdminService.ts):
  proxy seluruh endpoint RAG ke `ai-agent` (`/api/rag/documents`, `/stats`, `/search`,
  `/reindex`, `/upload`, DELETE dokumen). Bila agent tidak terjangkau → `502` dengan kode
  `AGENT_UNREACHABLE`; kegagalan agent lain → `AGENT_ERROR`.
- Endpoint RAG backend dilindungi `authenticate` (cookie JWT) di
  [`ragRoutes.ts`](../property-management-be/src/routes/ragRoutes.ts). Service `ai-agent`
  sendiri tidak memiliki auth karena hanya diakses internal.

### 3.7 Pengaturan WhatsApp & test mode

- [`settings.ts`](../property-management-be/src/lib/settings.ts): `isWhatsAppEnabled()`
  adalah sumber kebenaran. Env `WHATSAPP_API_ENABLED=false` memaksa nonaktif; jika tidak,
  mengikuti `settings.whatsapp_enabled`.
- [`whatsapp.ts`](../property-management-be/src/lib/whatsapp.ts): `sendWhatsAppMessage()`
  memakai Meta Graph API (`v19.0`, dapat dioverride `WHATSAPP_GRAPH_VERSION`). Saat
  integrasi nonaktif, fungsi tidak melakukan panggilan jaringan dan mengembalikan id mock
  `local-<uuid>`.
- [`testMode.ts`](../property-management-be/src/lib/testMode.ts): `assertTestModeAllowed()`
  hanya mengizinkan endpoint simulasi bila WhatsApp nonaktif **dan** `NODE_ENV !== "production"`.

### 3.8 Realtime (Socket.IO)

File: [`socket/server.ts`](../property-management-be/src/socket/server.ts). Autentikasi
socket memakai cookie `access_token` (`verifyToken`). Event yang dipancarkan:

| Event | Payload | Dipicu oleh |
| --- | --- | --- |
| `message:new` | `Message` | pesan masuk/keluar |
| `conversation:updated` | `Conversation` | perubahan percakapan |
| `conversation:new` | `Conversation` | percakapan baru |

Client dapat `join`/`leave` room `conversation:<id>`.

### 3.9 Referensi REST API (fitur AI/lead)

Base path `/api/v1`; semua route (kecuali webhook) memerlukan cookie `access_token`.

| Method | Path | Deskripsi |
| --- | --- | --- |
| GET | `/conversations` | Daftar percakapan (pagination + `search`). |
| GET | `/conversations/:id` | Detail percakapan. |
| POST | `/conversations/create` | Buat/ambil percakapan (test mode). |
| POST | `/conversations/update` | Update `name`, `agent_run`, `unread_count`. |
| POST | `/conversations/clear` | Hapus semua pesan percakapan. |
| POST | `/conversations/delete` | Hapus percakapan. |
| GET | `/messages?conversation_id=` | Daftar pesan (pagination). |
| POST | `/messages/send` | Kirim pesan manual sebagai `consultant`. |
| POST | `/messages/simulate` | Suntik pesan pelanggan (test mode). |
| GET | `/leads` | Daftar lead (filter `status`, `search`). |
| PATCH | `/lead/:id/toggle-agent` | Toggle handoff/agent per lead. |
| GET | `/whatsapp/status` | Status integrasi WhatsApp. |
| GET | `/whatsapp/setup` | Baca konfigurasi WhatsApp. |
| POST | `/whatsapp/setup` | Update konfigurasi WhatsApp. |
| POST | `/rag/upload` | Upload PDF ke knowledge base (multipart, maks 15 MB). |
| GET | `/rag/documents` | Daftar dokumen. |
| GET | `/rag/stats` | Statistik inventory/dokumen. |
| DELETE | `/rag/documents/:id` | Hapus dokumen + embedding-nya. |
| POST | `/rag/search` | Semantic search pada knowledge base. |
| POST | `/rag/reindex` | Rebuild seluruh vector store. |
| GET/POST | `/webhook/whatsapp` | Verifikasi & penerimaan webhook Meta. |

> Kontrak respons agent yang dikonsumsi backend didefinisikan sebagai
> `AgentResponsePayload` di [`types/index.ts`](../property-management-be/src/types/index.ts).

---

## 4. Service `ai-agent`

### 4.1 Struktur folder & tanggung jawab

Service ini memakai pemisahan **business logic** vs **app logic** (ports & adapters),
sehingga aturan bisnis tidak bergantung pada Express/PostgreSQL/OpenAI dan mudah
dipindah ke tempat lain:

```
ai-agent/src/
├── index.ts                     # Bootstrap HTTP (tipis → composition/container)
├── backfill.ts                  # CLI reindex (tipis → composition/container)
│
├── domain/                      # BISNIS LOGIC — murni, tanpa impor infra
│   ├── types.ts                 # Tipe domain + ConversationTurn
│   ├── lead/                    # leadData, scoring, listingGate
│   ├── handoff/                 # handoffGate
│   ├── budget/                  # parseBudget
│   ├── catalog/                 # types, groupListings, catalogBlocks, wantsUnitDetail,
│   │                            # format, listingDocument
│   ├── matching/                # text (tokenize/levenshtein), matchAreas
│   ├── knowledge/               # sanitizeMetadata
│   └── conversation/            # systemPrompt, parseAgentResult, ChatPrompt
│
├── application/                 # APP LOGIC — use-case + port (hanya domain + ports)
│   ├── ports/                   # LlmPort, CatalogRepository, KnowledgeRepository,
│   │                            # SessionRepository, DocumentStore, TextExtractor,
│   │                            # TextChunker, VectorStore
│   ├── processMessage.ts         # createAgentService (processMessage, resetSession)
│   ├── contextBuilder.ts         # perakitan konteks + pesan augmented
│   ├── errors.ts
│   └── rag/                     # retrieve, ingestDocument, embedListings, reindex,
│                                # getStats, uploadDocument
│
├── infrastructure/              # ADAPTER konkret (framework/lib/db)
│   ├── config.ts
│   ├── db.ts
│   ├── llm/openAiLlm.ts
│   ├── persistence/             # pgSessionRepository, pgCatalogRepository, pgDocumentStore
│   ├── knowledge/               # vectorStore, pgVectorKnowledgeRepository
│   ├── pdf/pdfTextExtractor.ts
│   └── text/recursiveTextChunker.ts
│
├── presentation/http/routes.ts  # Express app + route
└── composition/container.ts     # Composition root (DI: port → adapter)
```

**Aturan dependensi:** `domain ← application ← (infrastructure, presentation)`;
`composition` merakit semuanya. `domain/` dan `application/` tidak boleh mengimpor
`express`, `pg`, `@langchain/*`, `openai`, `pdf-parse`, atau folder
`infrastructure`/`presentation`/`composition` — ditegakkan oleh aturan
`no-restricted-imports` di `eslint.config.mjs`.

- **Domain** — aturan bisnis murni (skoring lead, gate handoff/listing, parsing budget,
  agregasi & render katalog, pencocokan area/proyek, prompt, parsing hasil LLM).
- **Application** — orkestrasi use-case lewat port; opsi runtime (topK, limit unit,
  riwayat, chunk) di-inject, bukan dibaca dari env.
- **Infrastructure** — satu-satunya tempat kode spesifik Express/pg/pgvector/OpenAI/pdf-parse.

### 4.2 Endpoint `ai-agent`

Tidak ada auth (service internal). Route di
[`presentation/http/routes.ts`](../ai-agent/src/presentation/http/routes.ts):

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/health` | Health check. |
| POST | `/message` | `processMessage` — inti percakapan agent. |
| POST | `/reset` | `resetSession` — hapus cache + state persisten satu nomor. |
| POST | `/api/rag/upload` | Upload PDF (multer memory, maks 15 MB), ekstraksi + chunk + embed. |
| GET | `/api/rag/documents` | Daftar dokumen. |
| GET | `/api/rag/stats` | Statistik embedding. |
| DELETE | `/api/rag/documents/:id` | Hapus embedding + dokumen. |
| POST | `/api/rag/search` | `retrieve(query, k)`. |
| POST | `/api/rag/reindex` | `reindex()` — rebuild inventory + dokumen. |

### 4.3 `processMessage()` — alur inti

File: [`application/processMessage.ts`](../ai-agent/src/application/processMessage.ts)
(factory `createAgentService`); prompt di
[`domain/conversation/systemPrompt.ts`](../ai-agent/src/domain/conversation/systemPrompt.ts).

1. Ambil/buat sesi (`Map` in-memory, fallback hydrate dari `conversations.agent_state`).
2. **Early exit**: bila `session.needs_human_followup` sudah true, kembalikan
   `resultFromKnown()` (closing, tanpa tanya lagi).
3. `buildContext()` ([`application/contextBuilder.ts`](../ai-agent/src/application/contextBuilder.ts))
   merakit konteks RAG lewat port `CatalogRepository` + `KnowledgeRepository`.
4. `buildAugmentedMessage()` menggabungkan identitas pelanggan, `[KNOWN CUSTOMER DATA]`,
   konteks RAG, reminder schema, dan pesan user.
5. Panggil LLM lewat `LlmPort` (adapter `OpenAiLlm`, model dari `OPENAI_MODEL`,
   `temperature: 0.4`).
6. `parseResult()` — ekstrak objek JSON dari respons LLM (defensif; gagal → fallback).
7. Merge `lead_data` ke `session.known`, normalisasi area, backfill per-turn, lalu
   **hitung ulang** `lead_score` dan `lead_status` server-side.
8. `enforceHandoffGate()` — blokir handoff prematur.
9. Gate listing: bila `budget` belum diketahui tetapi balasan memuat baris listing,
   listing dihapus (`stripListingLines`) dan handoff dibatalkan.
10. Simpan sesi lewat `SessionRepository` (riwayat dipangkas `MAX_HISTORY_TURNS × 2`).

### 4.4 Konteks per turn

Blok yang disuntikkan ke prompt:

| Blok | Sumber |
| --- | --- |
| `[Customer Phone]` / `[Customer Name]` | payload request |
| `[KNOWN CUSTOMER DATA]` | `session.known` (field yang sudah diketahui + yang masih missing) |
| `[AVAILABLE AREAS]` | distinct `properties.city` (cache 5 menit) |
| `[KNOWLEDGE BASE]` | hasil retrieval dokumen non-inventory |
| `[PROPERTY CATALOG]` | listing properti + ringkasan blok dari PostgreSQL |
| `[UNIT DETAIL]` | detail unit (hanya saat diminta atau jumlah unit sedikit) |
| `[SYSTEM REMINDER]` | kewajiban balas JSON + daftar field yang masih missing |

### 4.5 Prompt & conversation flow

`SYSTEM_PROMPT` (konstanta di `domain/conversation/systemPrompt.ts`) memuat persona sales, aturan grounding
anti-halusinasi, tipe properti, flow ketat **STEP 1–5** (intent → kumpulkan field →
tampilkan listing property-level → unit-level → fallback → handoff), format output JSON,
contoh few-shot, dan 16 aturan STRICT.

### 4.6 Ekstraksi lead, scoring & status

- Field yang diekstrak: `name, budget, property_type, size, area, purpose`
  (`KNOWN_KEYS`), plus `extra_info`.
- `purpose` default `"Buy"`. `area` = kota properti.
- **Scoring**: `+20` per field terisi dari `budget, property_type, area, size, purpose`
  (`SCORED_FIELDS`; `name` tidak dihitung).
- **Status**: `≥ 60` → `hot`, `40–59` → `warm`, `< 40` → `cold`.
- `next_action`: `collect_info` | `human_followup`.
- `mergeLeadData()` hanya menimpa dengan nilai non-kosong — field yang tidak disebut pada
  turn berikutnya tidak pernah hilang.

### 4.7 Deterministic gates

- [`domain/handoff/handoffGate.ts`](../ai-agent/src/domain/handoff/handoffGate.ts) —
  `enforceHandoffGate()` memaksa `needs_human_followup = false` dan menghapus frasa handoff
  bila `budget`, `area`, dan `property_type` belum semuanya terisi.
- [`domain/lead/listingGate.ts`](../ai-agent/src/domain/lead/listingGate.ts) —
  `containsListingLines()` / `stripListingLines()` mendeteksi baris listing (bullet,
  penomoran, `Property:`) dan menghapusnya bila budget belum diketahui.

### 4.8 Persistensi sesi

- Cache in-memory `Map<string, AgentSession>` di
  [`application/processMessage.ts`](../ai-agent/src/application/processMessage.ts).
- Sumber kebenaran: `conversations.agent_state` (JSONB) via
  [`infrastructure/persistence/pgSessionRepository.ts`](../ai-agent/src/infrastructure/persistence/pgSessionRepository.ts).
- `AgentSession` = `{ history, known, needs_human_followup, user_type }`.
- Riwayat disimpan sebagai `[{ role: "human"|"ai", content }]`, dipangkas
  `MAX_HISTORY_TURNS × 2`, dan divalidasi oleh `normalizeAgentState()` agar aman terhadap
  data lama/rusak.
- `resetSession()` menghapus cache dan mengosongkan `agent_state`.

---

## 5. RAG (pgvector) & Katalog Listing

### 5.1 Vector store

File: [`infrastructure/knowledge/vectorStore.ts`](../ai-agent/src/infrastructure/knowledge/vectorStore.ts)
(dipakai oleh adapter [`pgVectorKnowledgeRepository.ts`](../ai-agent/src/infrastructure/knowledge/pgVectorKnowledgeRepository.ts)).

- Embedding: `OpenAIEmbeddings` (`OPENAI_EMBEDDING_MODEL`, default
  `text-embedding-3-small`, dimensi `EMBEDDING_DIMENSIONS`, default `1536`).
- Store: `PGVectorStore.initialize` dengan `distanceStrategy: "cosine"`.
- Tabel: `VECTOR_TABLE` (default `rag_embeddings`), collection table
  `VECTOR_COLLECTION_TABLE` (default `rag_collections`), collection name `lcm`.
- Inisialisasi lazy (promise tunggal) + pembuatan HNSW index; error "sudah ada" diabaikan.

### 5.2 Ingest inventory

`PgCatalogRepository.fetchAvailableUnits()` (adapter) mengambil unit `available` dengan
`property_type` dan `price` non-null, join ke `blocks` dan `properties`.
`listingToDocument()` ([`domain/catalog/listingDocument.ts`](../ai-agent/src/domain/catalog/listingDocument.ts))
mengubah tiap baris menjadi `StoredDocument` (teks terstruktur) dengan metadata:
`doc_type: "inventory"`, `ref_id` (unit id), `area`, `property_type`, `size`, `price`,
`property_name`, `block_name`, `unit_name`, `status`. `embedListings()`
([`application/rag/embedListings.ts`](../ai-agent/src/application/rag/embedListings.ts))
menghapus vektor inventory lama lalu menambahkan yang baru (batch 100 di adapter).

### 5.3 Ingest dokumen PDF

`ingestDocument()` ([`application/rag/ingestDocument.ts`](../ai-agent/src/application/rag/ingestDocument.ts))
memecah teks lewat port `TextChunker` (adapter
[`RecursiveTextChunker`](../ai-agent/src/infrastructure/text/recursiveTextChunker.ts),
`CHUNK_SIZE` default 1000, `CHUNK_OVERLAP` default 200) dan menyimpan setiap chunk dengan
metadata `doc_type: "document"`, `ref_id`, `source`, `chunk_index`. Blob PDF asli disimpan
di tabel `documents` ([`pgDocumentStore.ts`](../ai-agent/src/infrastructure/persistence/pgDocumentStore.ts)).
Ekstraksi teks lewat port `TextExtractor` (adapter
[`PdfTextExtractor`](../ai-agent/src/infrastructure/pdf/pdfTextExtractor.ts), `pdf-parse`).

### 5.4 Retrieval

`KnowledgeRepository.retrieve(query, k, filter?)` (implementasi
[`pgVectorKnowledgeRepository.ts`](../ai-agent/src/infrastructure/knowledge/pgVectorKnowledgeRepository.ts))
memakai `similaritySearchWithScore`. Agent memanggilnya
dengan filter `{ doc_type: "document" }` (`DOC_TYPE_DOCUMENT`) dan `k = AGENT_TOP_K`
(default 12). Listing tidak diambil lewat vector search, melainkan langsung dari tabel
(katalog) untuk akurasi.

### 5.5 Reindex / backfill

`reindex()` ([`application/rag/reindex.ts`](../ai-agent/src/application/rag/reindex.ts))
bersifat idempoten: hapus seluruh vektor `doc_type: "document"`, embed ulang listing, lalu
re-ingest semua baris `documents`. Dijalankan via:

```bash
make backfill        # = docker compose exec ai-agent npm run rag:reindex
make reindex         # alias backfill
```

### 5.6 Statistik

`getKnowledgeStats()` ([`application/rag/getStats.ts`](../ai-agent/src/application/rag/getStats.ts))
menghitung jumlah embedding per `doc_type` (`inventory`, `document`) dan jumlah baris tabel
`documents`, dipakai dashboard Knowledge Base.

### 5.7 Katalog & pencocokan area/proyek

Adapter: [`infrastructure/persistence/pgCatalogRepository.ts`](../ai-agent/src/infrastructure/persistence/pgCatalogRepository.ts).
Domain: [`domain/catalog`](../ai-agent/src/domain/catalog) + [`domain/matching`](../ai-agent/src/domain/matching).

- `fetchCatalog()` — query unit `available` dengan filter kota, `propertyIds`, tipe,
  dan `maxPrice` (budget); hasil dikelompokkan oleh `groupListings()`.
- `groupListings()` — mengelompokkan baris menjadi `properties → blocks → units` dengan
  agregat harga/luas/tipe ([`domain/catalog/groupListings.ts`](../ai-agent/src/domain/catalog/groupListings.ts)).
- `buildPropertyCatalogBlock()` / `buildUnitDetailBlock()`
  ([`domain/catalog/catalogBlocks.ts`](../ai-agent/src/domain/catalog/catalogBlocks.ts)) —
  blok `[PROPERTY CATALOG]` dan `[UNIT DETAIL]` (dibatasi `AGENT_UNIT_DETAIL_LIMIT`).
- `wantsUnitDetail()` — mendeteksi permintaan detail (kata kunci `detail`, `unit`, `tipe`,
  `luas`, dst.) atau penyebutan nama properti/blok.
- `detectMatchingAreas()` / `detectMatchingProperties()`
  ([`domain/matching/matchAreas.ts`](../ai-agent/src/domain/matching/matchAreas.ts)) —
  pencocokan toleran typo dengan `tokenize()` + jarak `levenshtein()` (maks 1), untuk alias
  seperti "brasia garden" → "Brassia Garden".
- `parseBudgetToIdr()` ([`domain/budget/parseBudget.ts`](../ai-agent/src/domain/budget/parseBudget.ts))
  mengubah "2 Miliar", "Rp 3 M", "500 juta", "1.5m" menjadi nominal IDR.

---

## 6. Frontend

### 6.1 Halaman

Routing di [`App.tsx`](../property-management-fe/src/App.tsx) (semua terproteksi
`ProtectedRoute`, kecuali `/login`):

| Path | Halaman |
| --- | --- |
| `/conversations`, `/conversations/:id` | Daftar + detail percakapan WhatsApp (kirim balasan, toggle agent). |
| `/leads` | Daftar lead (filter status, skor, toggle handoff). |
| `/knowledge-base` | Upload/daftar/hapus dokumen RAG, statistik, search, reindex. |
| `/settings` | Pengaturan umum. |
| `/settings/whatsapp` | Konfigurasi WhatsApp Cloud API + status integrasi. |
| `/properties`, `/properties/:id` | CRUD properti/blok/unit (lihat docs 03–04). |

### 6.2 Hooks & client

| Hook / modul | Fungsi |
| --- | --- |
| `useConversations`, `useConversationMutations` | Query + create/update/clear/delete percakapan. |
| `useMessages`, `useMessageMutations` | Query pesan, kirim manual, simulasi pesan pelanggan. |
| `useLeads`, `useToggleLeadAgent` | Query lead + toggle agent/handoff. |
| `useRagDocuments`, `useRagStats`, `useRagMutations` | Knowledge base (upload, delete, search, reindex). |
| `useWhatsappStatus`, `useWhatsappSetup`, `useUpdateWhatsappSetup` | Pengaturan WhatsApp. |
| `useRealtime` + [`lib/socket.ts`](../property-management-fe/src/lib/socket.ts) | Berlangganan Socket.IO dan invalidate query terkait. |

Semua request via [`lib/api.ts`](../property-management-fe/src/lib/api.ts)
(`credentials: "include"`, auto-redirect ke `/login` saat `401`).

---

## 7. Konfigurasi & Operasional

### 7.1 Environment variables

**`property-management-be/.env`**

| Variabel | Default | Deskripsi |
| --- | --- | --- |
| `APP_PORT` | `4000` | Port API. |
| `CORS_ORIGIN` | `http://localhost:3000` | Origin yang diizinkan. |
| `JWT_SECRET` | — | Secret JWT (wajib). |
| `JWT_TTL_SECONDS` | `28800` | Umur token (8 jam). |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `property_management` / `postgres` / `postgres` | Koneksi PostgreSQL. |
| `AI_AGENT_URL` | `http://localhost:8080` | Base URL service `ai-agent`. |
| `WHATSAPP_API_ENABLED` | — | `false` memaksa test mode (menimpa Settings). |
| `WHATSAPP_GRAPH_VERSION` | `v19.0` | Versi Meta Graph API. |

**`ai-agent/.env`**

| Variabel | Default | Deskripsi |
| --- | --- | --- |
| `PORT` | `8080` | Port service agent. |
| `OPENAI_API_KEY` | — | API key OpenAI. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model chat. |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Model embedding. |
| `EMBEDDING_DIMENSIONS` | `1536` | Dimensi vektor. |
| `AGENT_TOP_K` | `12` | Jumlah chunk dokumen saat retrieval. |
| `MAX_HISTORY_TURNS` | `20` | Batas riwayat percakapan. |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `1000` / `200` | Pemecahan dokumen PDF. |
| `AGENT_UNIT_DETAIL_LIMIT` | `30` | Batas unit pada `[UNIT DETAIL]`. |
| `DB_*` | sama dengan backend | Database bersama. |

### 7.2 Docker Compose

- `ai-agent` mount `./ai-agent:/app`, env `DB_HOST: db`, port host `AGENT_PORT` (default
  `5000`) → container `8080`.
- `backend` mount `./property-management-be:/app`, env `AI_AGENT_URL: http://ai-agent:8080`.
- `db` memakai image `pgvector/pgvector:pg16` (ekstensi `vector` tersedia).
- Volume terpisah untuk `node_modules` tiap service.

### 7.3 Make targets terkait

```bash
make up            # build + start semua service
make backfill      # rebuild RAG vector store (idempotent)
make reindex       # alias backfill
make reset-leads   # TRUNCATE messages, leads, conversations
make reset-agent   # restart ai-agent + set agent_run = true untuk semua percakapan
make agent-shell   # shell ke container ai-agent
```

### 7.4 Test mode WhatsApp

Ketika `WHATSAPP_API_ENABLED=false` (default) atau `settings.whatsapp_enabled = false`:

- Outbound: `sendWhatsAppMessage()` tidak memanggil Meta, mengembalikan id mock
  `local-<uuid>`; pesan tetap disimpan + event Socket.IO tetap dipancarkan.
- Inbound: pesan pelanggan dapat disimulasikan lewat `POST /api/v1/messages/simulate`
  (`{ phone, text, name? }`), hanya tersedia saat test mode dan non-production.

---

## 8. Testing

Unit test ada di service `ai-agent` (Vitest), dijalankan dengan `npm test`:

| File | Cakupan |
| --- | --- |
| `domain/lead/leadData.test.ts` | Merge/backfill lead, scoring, gate baris listing, normalisasi area. |
| `domain/handoff/handoffGate.test.ts` | `hasKeyInfo`, `enforceHandoffGate`, `stripHandoffPhrase`. |
| `domain/budget/parseBudget.test.ts` | `parseBudgetToIdr` (miliar/juta/ribu, format Indonesia). |
| `domain/matching/matchAreas.test.ts` | Pencocokan area & nama proyek toleran typo. |
| `domain/catalog/groupListings.test.ts` | `groupListings`, builder katalog/unit detail, `wantsUnitDetail`. |

Backend dan frontend belum memiliki suite test otomatis; verifikasi backend lewat
`npm run type-check` dan `npm run lint`.

---

## 9. Batasan & Catatan

- **Single-tenant per nomor** — satu `phone` = satu `conversation` = satu `lead`.
- **Duplikasi regex handoff** di `ai-agent` (`handoff.ts`) dan backend (`agentPipeline.ts`)
  disengaja sebagai pertahanan berlapis di dua proses berbeda.
- **Skor lead** selalu dihitung ulang server-side dan dijaga monotonik; angka mentah dari
  LLM tidak dipercaya.
- **Service `ai-agent` tanpa auth** — jangan diekspos langsung ke publik; akses RAG dari
  UI melalui proxy backend yang ber-auth.
- **Kredensial & toggle WhatsApp** disimpan di tabel `settings` (plaintext). Untuk
  produksi, aktifkan integrasi hanya setelah mengisi kredensial Meta yang valid.
- **HNSW index** dibuat sekali; kegagalan "already exists" diabaikan, store dibuat lazy
  saat pertama diakses.
- **`lead_status` default skema `new`** hanya untuk baris non-agent; jalur agent selalu
  mengisi `cold/warm/hot`.
- Endpoint `DELETE /rag/documents/:id` pada implementasi saat ini **sudah** menghapus
  embedding terkait sebelum menghapus baris dokumen.

---

## 10. Cross-reference

- Scope & stack umum → [`01-OVERVIEW.md`](./01-OVERVIEW.md)
- Skema database & migrasi → [`02-DATABASE.md`](./02-DATABASE.md)
- Backend auth + properti/blok/unit → [`03-BACKEND.md`](./03-BACKEND.md)
- Frontend → [`04-FRONTEND.md`](./04-FRONTEND.md)
- Prompt regenerasi → [`05-REGENERATION-PROMPT.md`](./05-REGENERATION-PROMPT.md)
