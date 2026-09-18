# 07 — Jejak Entri Code: Alur Conversation & AI Agent RAG

Referensi trace end-to-end dari UI → frontend → backend → DB → AI Agent/RAG → kembali ke UI, untuk dua jalur:

- **JALUR A — Test Mode** (integrasi WhatsApp OFF): percakapan dibuat & dipicu dari frontend.
- **JALUR B — Produksi** (integrasi WhatsApp ON): percakapan dibuat & dipicu oleh webhook Meta.

Kunci desain: kedua jalur **bertemu di satu fungsi** `handleIncomingMessage`, sehingga seluruh proses AI/RAG-nya satu jalur kode. Perbedaan nyata hanya di input, medium pengiriman keluar, dan cara hasil kembali ke UI.

---

## 1. Peta Arsitektur

| Komponen | Folder | Peran |
|---|---|---|
| Frontend | `property-management-fe/` | React + Vite + TanStack Query + React Router + Socket.IO client |
| Backend | `property-management-be/` | Express + PostgreSQL + Socket.IO server + Meta WhatsApp Cloud API client |
| AI Agent | `ai-agent/` | Express terpisah: LLM + RAG (pgvector) |
| Database | PostgreSQL | `conversations`, `messages`, `leads`, `settings`, `rag_embeddings` |
| Eksternal | Meta WhatsApp Cloud API | Webhook masuk + Graph API keluar |

Mount backend (`property-management-be/src/index.ts`):

```
72: app.use(`${API_VERSION}/webhook`, webhookRoutes);   // SEBELUM rate limiter
74: app.use(`${API_VERSION}`, generalLimiter);
79: app.use(`${API_VERSION}/conversations`, conversationsRoutes);
80: app.use(`${API_VERSION}/messages`, messagesRoutes);
82: app.use(`${API_VERSION}`, settingsRoutes);          // /whatsapp/*
```

> Webhook sengaja di-mount lebih dulu agar tidak terkena rate limit (Meta melakukan retry).

---

## 2. Dua Jalur & Titik Konvergensi

```
JALUR A  POST /api/v1/messages/simulate ─┐
                                          ├─► handleIncomingMessage()  agentPipeline.ts:155
JALUR B  POST /api/v1/webhook/whatsapp ──┘        └─► callAgent()  :195
```

`simulateMessageController` (`messagesController.ts:51`) dan `receiveWebhookController` (`webhookController.ts:98`) memanggil fungsi yang sama. Mulai dari langkah AI/RAG (**§6**) tidak ada percabangan A/B.

---

## 3. JALUR A — Test Mode (WhatsApp OFF)

### A.1 Deteksi test mode

- `ConversationsPage.tsx:184` → `useWhatsappStatus()`
- `api.ts:372` → `GET /api/v1/whatsapp/status`
- `ConversationsPage.tsx:185` → `testMode = whatsappEnabled === false`
- Tombol "New" hanya dirender saat `testMode` → `ConversationsPage.tsx:301-308`
- Opsi composer "Customer (simulate)" hanya saat test mode → `ConversationsPage.tsx:292`

### A.2 Create conversation (input nomor + nama)

**Frontend**

1. Submit modal → `NewConversationModal.handleSubmit` `ConversationsPage.tsx:55-62` → `onSubmit` (`:61`)
2. `handleCreate` `ConversationsPage.tsx:249-260` → `createConversation.mutateAsync(input)` `:251`
3. Hook `useConversations.ts:16-19` → `api.createConversation`
4. `api.ts:318-322` → `POST /api/v1/conversations/create` body `{phone, name}`

**Backend**

5. Mount `index.ts:79` → `/api/v1/conversations`
6. Route `conversationsRoutes.ts:16` → `authenticate` → `createConversationController`
7. `conversationsController.ts:28-44`:
   - `assertTestModeAllowed()` `:29` → `lib/testMode.ts:8-19` (tolak 403 jika WA ON / `NODE_ENV=production`)
   - validasi `phone` `:31-36`
   - `findOrCreateConversation({phone, name})` `:39`
8. Service `conversationsService.ts:37-70`:
   - `findConversationByPhone` `:18-24` (`SELECT ... WHERE phone = $1`)
   - belum ada → `INSERT ... ON CONFLICT (phone) DO NOTHING RETURNING` `:53-59`
   - return `{conversation, created}` → HTTP 201 jika created `:40-43`
9. Kembali ke UI: `handleCreate` navigasi `/conversations/{id}` `ConversationsPage.tsx:253`

### A.3 GET list conversations

1. `useConversations` `useConversations.ts:5-10` (query key `['conversations', params]`)
2. Dipanggil `ConversationsPage.tsx:171-175` dengan `page=1, limit=30`
3. `api.ts:312-313` → `GET /api/v1/conversations?page=1&limit=30`
4. Route `conversationsRoutes.ts:14` → `getConversationsController` `conversationsController.ts:14-21`
5. Service `conversationsService.ts:124-166`, SQL `:149-155`
   (`ORDER BY last_message_at DESC NULLS LAST, created_at DESC`)

### A.4 GET list messages

1. `selected` dicari dari array `conversations` `ConversationsPage.tsx:179`
2. `useMessages(selected?.id)` `ConversationsPage.tsx:181` → hook `useMessages.ts:5-12`
3. `api.ts:345-346` → `GET /api/v1/messages?conversation_id=...&page=1&limit=100`
4. Route `messagesRoutes.ts:11` → `getMessagesController` `messagesController.ts:8-22`
5. Service `messagesService.ts:48-80`, SQL `:63-69` (`ORDER BY timestamp ASC`)
6. Render bubble `ConversationsPage.tsx:410-425`

> UI tidak punya kontrol paginasi pesan; selalu `page=1, limit=100`. Karena urutan ASC, page 1 = 100 pesan terlama.

### A.5 Kirim sebagai Customer (simulate) — inti test mode

1. `handleSend` `ConversationsPage.tsx:205-228`; cabang customer+testMode `:209-214` → `simulateMessage.mutateAsync`
2. Hook `useMessages.ts:31-34` → `api.ts:354-358` → `POST /api/v1/messages/simulate`
3. Route `messagesRoutes.ts:13` → `simulateMessageController` `messagesController.ts:38-59`
   - `assertTestModeAllowed()` `:39`
   - `handleIncomingMessage({ phone, name, text, whatsappMessageId: \`sim-${randomUUID()}\` })` `:51-56`
4. **Pipeline bersama** `agentPipeline.ts:155-226` (lihat §6)
   - `sendWhatsAppMessage` mengembalikan **mock** `local-${uuid}` (`whatsapp.ts:20-23`) tanpa network

### A.6 Kirim sebagai Consultant (manual — tetap jalan walau WA ON)

`ConversationsPage.tsx:215-220` → `useMessages.ts:26-29` → `api.ts:348-352` → `POST /api/v1/messages/send` → `messagesRoutes.ts:12` → `sendMessageController` `messagesController.ts:24-36` → `sendManualMessage` `agentPipeline.ts:142-148` → `sendAndStore(..., 'consultant')`.

### A.7 UI update

- Backend `io.emit('message:new', ...)` `socket/server.ts:49-51` (+ `conversation:new/updated` `:53-59`)
- Klien `lib/socket.ts:6-21`; listener `useRealtime.ts:24-26`
- `onMessage` `useRealtime.ts:15-18` → invalidate `['messages', conversation_id]` + `['conversations']`
- Jalur instan dari mutasi: `useMessages.ts:31-34` → `invalidate` `:17-24`
- Refetch A.3/A.4 → bubble re-render `ConversationsPage.tsx:410-425`

---

## 4. JALUR B — Produksi (WhatsApp ON)

### B.0 Prasyarat konfigurasi (sekali)

- UI `WhatsAppSettingsPage.tsx` → `GET/POST /api/v1/whatsapp/setup` (`api.ts:372-380`) → `settingsRoutes`/`settingsController` → tabel `settings` (`migrations/012_settings.sql`)
- Callback URL: `${API_URL}/api/v1/webhook/whatsapp` (`WhatsAppSettingsPage.tsx:102`)
- Gerbang enable: `lib/settings.ts` `isWhatsAppEnabled`; dipakai `whatsapp.ts:20`
- Setup WABA/`subscribed_apps` di console Meta dilakukan **manual** (tidak ada otomasi)

### B.1 Verifikasi webhook (GET, sekali oleh Meta)

1. Meta: `GET /api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
2. Mount `index.ts:72` (sebelum `generalLimiter` `:74`)
3. Route `webhookRoutes.ts:10` → `verifyWebhookController` `webhookController.ts:35-52`
4. Bandingkan `hub.verify_token` dengan `settings.whatsapp_verify_token` → kirim `hub.challenge` atau 403

### B.2 Pesan masuk (POST oleh Meta)

1. Meta: `POST /api/v1/webhook/whatsapp` (body `object: whatsapp_business_account`)
2. Route `webhookRoutes.ts:11` → `receiveWebhookController` `webhookController.ts:54-113`
   - cek `body.object` `:68-71`
   - `getSettings` `:74`
   - loop `entry.changes` `:76-107`: filter `metadata.phone_number_id` `:79-87`, ambil nama `contacts[0].profile.name` `:89`
   - loop `value.messages` `:91-105`: `normalizeMessageText` `:18-33`, konversi Unix timestamp `:94-96`, panggil `handleIncomingMessage` `:98-104`
   - selalu balas `200 {status:'EVENT_RECEIVED'}` `:112`

### B.3 Pipeline inbound (sama dengan §6, sumber webhook)

`handleIncomingMessage` `agentPipeline.ts:155-226`:

- `findOrCreateConversation` `:160-164` → **auto-create conversation** dari `phone` (pengganti `POST /conversations/create`)
- `whatsappMessageId` = id asli Meta → idempotency `:167-172` mencegah duplikat saat Meta retry
- `createMessage` incoming `:174-182`, emit realtime `:187-188`
- agent OFF → `deliverBypass` `:190-193`; ON → `callAgent` `:195-199`
- `upsertLeadIfBuyer` `:216`; handoff `:218-222`; `deliverReply` `:224`

### B.4 Kirim balasan ke Meta Graph API

`deliverReply` `:76-90` → `sendAndStore` `:50-74` → `sendWhatsAppMessage` `whatsapp.ts:16-63`:

- `isWhatsAppEnabled()` true → token + `phone_number_id` `:25-27`
- `POST https://graph.facebook.com/v19.0/{phone_number_id}/messages` `:34-47`
- id respons disimpan sebagai `whatsapp_message_id` outgoing `:56`, `:59-67`

### B.5 UI update

- `emitNewConversation` `agentPipeline.ts:165` → `socket/server.ts:57-59` → `useRealtime.ts:26` invalidate `['conversations']`
- `emitNewMessage` `:187` → `useRealtime.ts:24` → refetch `['messages', id]`
- Tombol "New" hilang karena `testMode === false` (`ConversationsPage.tsx:301`)
- Webhook tidak terhubung ke sesi user → UI update murni via Socket.IO

---

## 5. Titik Konvergensi Kode

Baik `simulateMessageController` (`messagesController.ts:51`) maupun `receiveWebhookController` (`webhookController.ts:98`) memanggil:

```
handleIncomingMessage()   property-management-be/src/lib/agentPipeline.ts:155
```

Seluruh langkah §6 tidak memiliki percabangan A/B.

---

## 6. Bagian Bersama — AI Agent + RAG (Langkah 1–7)

### 1. Backend → AI Agent (HTTP boundary)

- `agentPipeline.ts:195-199` → `callAgent({phone, name, message})`
- `lib/agentClient.ts:12-30` → `POST ${AI_AGENT_URL}/message` (default `http://127.0.0.1:8080`, `:3`)
- `response.ok` false / unreachable → `null` → pipeline berhenti tanpa balasan `agentPipeline.ts:201-203`

### 2. Entry point AI Agent

- `ai-agent/src/index.ts:14` → `container.app.listen(...)`
- `container.ts:77` → `createApp({agent, rag})`
- Route `presentation/http/routes.ts:85-97`:
  - validasi zod `messageSchema` `:26-30`
  - `deps.agent.processMessage(parsed.data)` `:94`
  - balas `200 { success, phone, ...result }` `:95`
- Wiring dependency `container.ts:44-54`: `llm` `:38-42`, `catalog` `:36`, `knowledge=vectorStore` `:29/:47`, `sessions` `:37`

### 3. Agent service — session & percabangan

`application/processMessage.ts`

- `getOrCreateSession` `:79` → `:46-59` (cache in-memory dulu, lalu `PgSessionRepository.load`)
- **Early handoff** `:81-87`: jika `session.needs_human_followup` true → `resultFromKnown` (`parseAgentResult.ts:36-47`) → langsung balas closing, tanpa RAG/LLM
- normal → `buildContext` `:89-98`

### 4. RAG — Context Builder

`application/contextBuilder.ts:30-122`

1. **Areas** `:35` → `catalog.getKnownAreas()` → `pgCatalogRepository.ts:20-36` (`SELECT DISTINCT city FROM properties WHERE is_active`, cache 5 menit `:11`)
2. `detectMatchingAreas` `:36` (`domain/matching/matchAreas.ts`)
3. **Properties** `:40` → `getKnownProperties()` → `pgCatalogRepository.ts:39-55` (id, name, city) → `detectMatchingProperties` `:44`
4. **Knowledge base retrieval (RAG utama)** `:48-50`:
   - `knowledge.retrieve(userMessage, topK, { doc_type: DOCUMENT })` → `pgVectorKnowledgeRepository.ts:14-30`
   - → `getVectorStore()` `:19` → `infrastructure/knowledge/vectorStore.ts:21-56`:
     - `OpenAIEmbeddings` model `text-embedding-3-small`, 1536 dim `:8-14`, `config.ts:17-18`
     - `PGVectorStore.initialize(...)` `:23-37`, `distanceStrategy: 'cosine'`, tabel `rag_embeddings` `config.ts:33`
     - `createHnswIndex` `:40`
   - `store.similaritySearchWithScore(query, k, filter)` `:20-24` → skor cosine
   - `topK` default 12 `config.ts:22`
   - Catatan: retrieve difilter `doc_type=document` (`contextBuilder.ts:49`), jadi **listing tidak lewat vector** — listing diambil via SQL katalog
5. **Parsing budget** `:80` → `parseBudgetToIdr` (`domain/budget/parseBudget.ts`)
6. **Catalog properti** `:82-98` → `fetchCatalog` → `pgCatalogRepository.ts:58-107` (JOIN `units`+`blocks`+`properties`, filter city/type/maxPrice, hanya `status='available'`)
7. **Perakitan blok konteks** `:104-121`:
   - `[AVAILABLE AREAS]` `:105-107`
   - `[KNOWLEDGE BASE]` (hasil RAG) `:108-112`
   - `[PROPERTY CATALOG]` + `[UNIT DETAIL]` `:113-119` (`domain/catalog/catalogBlocks.ts`)
8. `buildAugmentedMessage` `:124-140`: gabung `identity` (phone/name) + `[KNOWN CUSTOMER DATA]` + `ragContext` + `[SYSTEM REMINDER]` + pesan user

### 5. LLM

- `processMessage.ts:104-108` → `deps.llm.generate({ system: SYSTEM_PROMPT, history, user: augmented })`
- `infrastructure/llm/openAiLlm.ts:23-36`: susun `SystemMessage` + history (`AIMessage`/`HumanMessage`) + `HumanMessage`, `ChatOpenAI.invoke` `:32`
- Model & temperature: `gpt-4o-mini`, 0.4 (`container.ts:38-42`, `config.ts:16`)
- Prompt & skema output JSON: `domain/conversation/systemPrompt.ts:1-75`

### 6. Parse & post-processing deterministik

`processMessage.ts`

- `parseResult(rawContent)` `:109` → `parseAgentResult.ts:20-34` (regex `JSON_BLOCK` `systemPrompt.ts:77`; gagal → `fallbackResult()` `:112`, `parseAgentResult.ts:8-18`)
- merge `session.known` `:115`, `normalizeArea` `:116`, `backfillLeadData` `:117-121`
- **scoring dihitung ulang server** `:122-123` → `domain/lead/scoring.ts:4-11` (20/field; ≥60 hot, 40-59 warm)
- **handoff gate** `:126` → `domain/handoff/handoffGate.ts:39-53` (tolak handoff bila budget/area/type belum lengkap)
- **listing gate** `:133-143` (bila budget belum ada, buang listing & tanya budget)
- update session `:145-149`, push history `:151-152`, `persistSession` `:154` → `:61-75` → `PgSessionRepository.save` `pgSessionRepository.ts:57-66` → tulis `conversations.agent_state` (JSONB)
- return `AgentResult` → respons HTTP `routes.ts:95`

### 7. Kembali ke backend pipeline

`lib/agentPipeline.ts`

- `agentData` diterima `:195-199`
- `callAgent` null → berhenti `:201-203`
- update `user_type` `:205-214`
- `upsertLeadIfBuyer` `:216` → `:101-139` → `services/leadsService.ts` (guard skor monoton `:110-115`)
- `needs_human_followup` → `agent_run = false` `:218-222`
- `deliverReply` `:224` → `:76-90` (tambah/strip frasa "Agen kami akan menghubungi Anda")

---

## 7. Kirim Balasan & Kembali ke UI (DI SINI A vs B BERBEDA)

### 8. Kirim keluar

`sendAndStore` `agentPipeline.ts:50-74` → `sendWhatsAppMessage` `lib/whatsapp.ts:16-63`:

- **JALUR A (OFF)** → `:20-23` tidak ada network, id mock `local-${uuid}`
- **JALUR B (ON)** → `:25-27` ambil token + `phone_number_id`; `POST https://graph.facebook.com/v19.0/{phone_number_id}/messages` `:34-47`; id asli Meta `:56`

Setelah itu (sama):

- simpan outgoing `createMessage` `:59-67`
- update `last_message_at` `:69`
- `emitNewMessage` `:70` → `emitConversationUpdated` `:71`

### 9. UI

- Emit global `socket/server.ts:49-59` (`message:new`, `conversation:updated`, `conversation:new`)
- Klien `lib/socket.ts:6-21`; listener `useRealtime.ts:24-26`
- `onMessage` `useRealtime.ts:15-18` → invalidate `['messages', conversation_id]` + `['conversations']`
- Refetch: `useMessages.ts:5-12` → `api.getMessages` `api.ts:345-346` → `GET /api/v1/messages?...` → `messagesController.ts:8-22` → `messagesService.ts:48-80` → render `ConversationsPage.tsx:410-425`
- **Jalur respons sinkron (A.5 simulate)**: controller menunggu seluruh pipeline LLM selesai sebelum balas (`messagesController.ts:51-58`), lalu `onSuccess` mutasi invalidate `useMessages.ts:31-34`
- **JALUR B**: webhook hanya balas `200 EVENT_RECEIVED`; balasan Agent + outgoing masuk lewat Socket.IO

---

## 8. Tabel Perbedaan A vs B

### Input (sebelum langkah 1)

| Input | Jalur A (simulate) | Jalur B (webhook) |
|---|---|---|
| `text` | mentah dari body | dinormalisasi `normalizeMessageText` `webhookController.ts:18-33` |
| `name` | dari form user `messagesController.ts:50` | `contacts[0].profile.name` `webhookController.ts:89` |
| `timestamp` | default `new Date()` | konversi Unix Meta `webhookController.ts:94-96` |
| `whatsappMessageId` | `sim-${uuid}` `messagesController.ts:55` | id asli Meta `message.id` `webhookController.ts:102` |

### Setelah langkah 7

| | Jalur A | Jalur B |
|---|---|---|
| Kirim keluar | mock `local-*` `whatsapp.ts:20-23` | Graph API `whatsapp.ts:34-47` |
| Percabangan | di dalam `sendWhatsAppMessage` via `isWhatsAppEnabled()` (`whatsapp.ts:20`) — kode shared | idem |
| Respons | sinkron: HTTP menunggu pipeline lalu balas hasil ke FE (`messagesController.ts:51-58`) | selalu balas `200 EVENT_RECEIVED` (`webhookController.ts:108-112`) |
| Update UI | mutasi `onSuccess` (`useMessages.ts:31-34`) + Socket.IO | Socket.IO saja (`useRealtime.ts:24-26`) |
| Error pipeline | dilempar → error handler → HTTP error ke FE | ditangkap `try/catch`, tetap 200 (`webhookController.ts:108-110`) |

**Kesimpulan:** proses AI/RAG satu jalur. Perbedaan nyata hanya di input, medium pengiriman (mock vs Graph), dan cara hasil kembali ke UI.

---

## 9. Peta File AI/RAG

| Tahap | File |
|---|---|
| HTTP entry | `ai-agent/src/presentation/http/routes.ts:85` |
| Orkestrasi agent/session | `ai-agent/src/application/processMessage.ts:77` |
| RAG context | `ai-agent/src/application/contextBuilder.ts:30` |
| Vector retrieval | `ai-agent/src/infrastructure/knowledge/pgVectorKnowledgeRepository.ts:14` + `vectorStore.ts:21` |
| Catalog SQL | `ai-agent/src/infrastructure/persistence/pgCatalogRepository.ts:58` |
| Session persist (`agent_state`) | `ai-agent/src/infrastructure/persistence/pgSessionRepository.ts:57` |
| LLM | `ai-agent/src/infrastructure/llm/openAiLlm.ts:23` |
| Parse output | `ai-agent/src/domain/conversation/parseAgentResult.ts:20` |
| Scoring & handoff | `ai-agent/src/domain/lead/scoring.ts:4`, `domain/handoff/handoffGate.ts:39` |
| Prompt/skema | `ai-agent/src/domain/conversation/systemPrompt.ts:1` |
| Boundary panggilan | `property-management-be/src/lib/agentClient.ts:12` |
| Kirim balasan | `property-management-be/src/lib/whatsapp.ts:16` |

---

## 10. Catatan & Gap

1. **Verifikasi signature webhook belum ada.** `receiveWebhookController` tidak memeriksa `X-Hub-Signature-256` (HMAC body dengan Meta App Secret). Hanya `hub.verify_token` GET yang dicek. Endpoint publik dan di luar rate limiter.
2. **Delivery/read receipt diabaikan.** Webhook hanya membaca `value.messages`; `value.statuses` tidak diproses.
3. **Text-only.** Outbound hanya `type: 'text'` (`whatsapp.ts:41-46`); media inbound menjadi placeholder `[image message]` dll.
4. **Create conversation hanya test mode.** `conversations/create` & `messages/simulate` digerbangi `assertTestModeAllowed()` (`testMode.ts:8-19`). Di produksi tidak ada jalur pembuatan manual/import.
5. **Pesan tanpa paginasi di UI.** Selalu `page=1, limit=100` (`useMessages.ts:5`); backend cap 200, default 50. Karena order ASC, page 1 = pesan terlama.
6. **"Load more" conversation mengganti, bukan menambah.** Query key menyertakan `page` (`useConversations.ts:7`), UI membaca `data.conversations` langsung (`ConversationsPage.tsx:176`).
7. **Deep-link rapuh.** `api.getConversation` (`api.ts:315`) tidak dipakai; `selected` hanya dari list yang termuat (`ConversationsPage.tsx:179`).
8. **Socket.IO broadcast global.** `emit*` memakai `io.emit` (`socket/server.ts:49-59`) meski room `conversation:join` sudah ada.
9. **Kredensial plaintext** di tabel `settings`; `GET /whatsapp/setup` mengembalikan access token ke user terautentikasi (`settingsController.ts:10-13`).
10. **`conversations.agent_state`** dipakai ai-agent (`pgSessionRepository.ts`) tetapi tidak disertakan backend `COLUMNS` (`conversationsService.ts:5`), jadi tidak terlihat via REST/FE.

---

## 11. Referensi

- `docs/06-AI-LEAD-MANAGEMENT.md` — arsitektur AI lead management.
- `docs/03-BACKEND.md`, `docs/04-FRONTEND.md`, `docs/02-DATABASE.md`.
- Kode kunci: `property-management-be/src/lib/agentPipeline.ts`, `ai-agent/src/application/processMessage.ts`, `ai-agent/src/application/contextBuilder.ts`.
