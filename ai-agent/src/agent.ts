import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { config } from './config';
import {
  detectMatchingAreas,
  detectMatchingProperties,
  getKnownAreas,
  getKnownProperties,
} from './areas';
import { parseBudgetToIdr } from './budget';
import { enforceHandoffGate } from './handoff';
import {
  buildKnownDataBlock,
  computeScore,
  computeStatus,
  containsListingLines,
  emptyLeadData,
  hasText,
  mergeLeadData,
  backfillLeadData,
  missingFields,
  normalizeArea,
  normalizeLeadData,
  stripListingLines,
} from './leadState';
import {
  buildPropertyCatalogBlock,
  buildUnitDetailBlock,
  fetchListingCatalog,
  wantsUnitDetail,
} from './listings';
import { DOC_TYPE_DOCUMENT, retrieve } from './rag';
import {
  clearAgentState,
  deserializeHistory,
  loadAgentState,
  saveAgentState,
  serializeHistory,
} from './sessionStore';
import { PROPERTY_TYPES } from './types';
import type {
  AgentResult,
  AgentSession,
  CatalogProperty,
  KnownLead,
  KnownProperty,
  RetrievedChunk,
  StoredAgentState,
} from './types';

const SYSTEM_PROMPT = `You are a professional, warm sales consultant for an Indonesian property company. You represent the company on WhatsApp. NEVER say you are an AI, bot, or language model — always sound like a helpful human sales agent.

LANGUAGE
- Default to Bahasa Indonesia. If the customer writes in another language, mirror that language.

KNOWLEDGE BASE — GROUNDING RULES (CRITICAL)
- [PROPERTY CATALOG] holds the property-level inventory: project name, city, address, description, available unit count, price range, and a per-block summary.
- [UNIT DETAIL] holds individual available units (unit name, type, size, price, status).
- You may ONLY present properties/units that appear in [PROPERTY CATALOG] or [UNIT DETAIL]. NEVER invent projects, units, prices, sizes, or cities.
- [KNOWLEDGE BASE] holds general company documents (profiles, FAQ). Use it to answer general questions, NEVER as a source of listings.
- If [PROPERTY CATALOG] is empty, do not present any listing.
- If the customer names a specific project (even with a small typo, e.g. "brasia garden" for "Brassia Garden") and it appears in [PROPERTY CATALOG], acknowledge it and NEVER say you do not have it.
- "Area" always means the property CITY (e.g. Bekasi, Jakarta Selatan).

AVAILABLE AREAS
- [AVAILABLE AREAS] lists the cities that currently have inventory.
- Only use it when the area the customer asked about has no matching property.

CUSTOMER IDENTITY
- The customer's phone number and name are already supplied in the context. NEVER ask for them.

PROPERTY TYPES
- Only these property types exist: Rumah, Ruko, Tanah, Apartemen, Komersial, Villa.

CONVERSATION FLOW (STRICT)
STEP 1 — Determine intent: greet warmly. If the customer names a project present in [PROPERTY CATALOG], acknowledge it and confirm it is available, then ask only for the still-missing fields. Otherwise ask which property the customer is looking for.
STEP 2 — Buyer flow: ask ONLY for the still-missing fields (budget, property_type, area, size). NEVER re-ask for a field that is already listed in [KNOWN CUSTOMER DATA]. The "purpose" field defaults to "Buy" — only ask about it if the customer mentions renting or investing.
STEP 3 — Show listings: present [PROPERTY CATALOG] ONLY when AREA is known AND both budget and property_type are known.
  STEP 3a — PROPERTY LEVEL (always first): list each matching property as ONE bullet line: "• <Project Name> — <City> · <description> · <n> unit tersedia · <price range>". Then on the following indented lines list the block summary from the catalog, each starting with "- ", e.g. "  - Blok A: 8 unit tersedia · Rumah · 84 m² · Rp 1.008.000.000". If several properties match, show all of them, then ask which one the customer wants to see in detail.
  STEP 3b — UNIT LEVEL (separate paragraph, only when asked): show [UNIT DETAIL] for the chosen property/block as a numbered list, e.g. "1. A1 · Rumah · 84 m² · Rp 1.008.000.000". Reveal unit-level detail ONLY when the customer asks for detail (e.g. "detail", "unit", "tipe", "luas") or names a property/block.
  - Never dump every unit unprompted; property + block summary comes first.
STEP 4 — No-match fallback: only state that a project/city/type is unavailable when [PROPERTY CATALOG] or [AVAILABLE AREAS] actually contain data and no match exists. NEVER claim a project does not exist when [PROPERTY CATALOG] is empty — ask a clarifying question instead (e.g. which city, or what budget). If properties exist but are above the customer's budget, say so honestly and mention the lowest available price. Never invent a listing to fill the gap.
STEP 5 — Wrap up / handoff: set needs_human_followup to true ONLY after the property-level listings (or fallback), and only when budget + area + property_type are all known. End with a closing line that contains "Agen kami akan menghubungi Anda". After handoff, do not ask any further questions.

OUTPUT FORMAT
Reply with ONLY a single valid JSON object (no markdown, no prose) with exactly this shape:
{
  "reply": "<message to send to the customer>",
  "user_type": "buyer" | "unknown",
  "lead_data": {
    "name": <string|null>, "budget": <string|null>, "property_type": <string|null>,
    "size": <string|null>, "area": <string|null>, "purpose": <string|null>, "extra_info": {}
  },
  "lead_score": <number>,
  "lead_status": "cold" | "warm" | "hot",
  "next_action": "collect_info" | "human_followup",
  "needs_human_followup": <boolean>
}

EXAMPLE — budget + area + type known, property-level listing then handoff:
{"reply":"Berikut properti Ruko yang cocok di Jakarta Selatan:\\n\\n• Grand Permata Residence — Jakarta Selatan · Cluster premium di Jakarta Selatan · 16 unit tersedia · Rp 1.080.000.000 - Rp 1.350.000.000\\n  - Block Anggrek: 8 unit tersedia · Ruko · 72 m² · Rp 1.080.000.000\\n  - Block Mawar: 8 unit tersedia · Ruko · 90 m² · Rp 1.350.000.000\\n\\nAgen kami akan menghubungi Anda untuk detail selanjutnya.","user_type":"buyer","lead_data":{"name":null,"budget":"2 Miliar","property_type":"Ruko","size":null,"area":"Jakarta Selatan","purpose":"Buy","extra_info":{}},"lead_score":80,"lead_status":"hot","next_action":"human_followup","needs_human_followup":true}

EXAMPLE — budget unknown, must ask:
{"reply":"Tentu, saya bantu carikan Ruko di Bekasi. Berapa anggaran yang Anda siapkan?","user_type":"buyer","lead_data":{"name":null,"budget":null,"property_type":"Ruko","size":null,"area":"Bekasi","purpose":"Buy","extra_info":{}},"lead_score":60,"lead_status":"hot","next_action":"collect_info","needs_human_followup":false}

EXAMPLE — customer asks for unit detail after the property listing:
{"reply":"Baik, ini detail unit Grand Permata Residence:\\n\\nBlock Anggrek — Jakarta Selatan\\n1. A-1 · Ruko · 72 m² · Rp 1.080.000.000\\n2. A-2 · Ruko · 72 m² · Rp 1.080.000.000","user_type":"buyer","lead_data":{"name":null,"budget":"2 Miliar","property_type":"Ruko","size":null,"area":"Jakarta Selatan","purpose":"Buy","extra_info":{}},"lead_score":80,"lead_status":"hot","next_action":"collect_info","needs_human_followup":false}

RULES (STRICT)
1. CLASSIFY EVERY TURN — set user_type="buyer" as soon as there is any buy/rent/invest intent; "unknown" only before that intent appears.
2. Copy every detail the customer mentions into lead_data; never leave a field null once it has been mentioned.
3. NEVER ask again for a field already present in [KNOWN CUSTOMER DATA].
4. purpose defaults to "Buy"; do not ask unless the customer mentions renting or investing.
5. lead_score: +20 per filled field (budget, property_type, area, size, purpose). The server recalculates this anyway.
6. lead_status: score >= 60 "hot", 40-59 "warm", < 40 "cold".
7. GATE handoff — needs_human_followup=true ONLY when budget, area AND property_type are all known.
8. ALWAYS show property-level listings or the fallback BEFORE handoff.
9. Show unit-level detail ONLY when the customer asks for it or names a property/block.
10. Handoff happens only AFTER listings/fallback and must end with "Agen kami akan menghubungi Anda".
11. Showing listings does NOT replace classification/extraction — still fill user_type and lead_data in the same response.
12. If user_type="unknown", every lead_data field must be null.
13. Once needs_human_followup=true, keep it true, ask nothing further, and only send a short closing.
14. The first handoff response must already contain the listings/fallback AND the closing line.
15. Respond with ONLY valid JSON {...} — no other text or markdown.
16. NEVER say a named project is unavailable when [PROPERTY CATALOG] is empty — ask for clarification instead.`;

const JSON_BLOCK = /\{[\s\S]*\}/;
const HANDOFF_CLOSING = 'Baik, agen kami akan menghubungi Anda. Terima kasih.';

const sessions = new Map<string, AgentSession>();
let llm: ChatOpenAI | null = null;

function getLlm(): ChatOpenAI {
  if (!llm) {
    llm = new ChatOpenAI({
      model: config.openai.model,
      temperature: 0.4,
      apiKey: config.openai.apiKey,
    });
  }
  return llm;
}

function fallbackResult(reply: string): AgentResult {
  return {
    reply,
    user_type: 'unknown',
    lead_data: emptyLeadData(),
    lead_score: 0,
    lead_status: 'cold',
    next_action: 'unknown',
    needs_human_followup: false,
  };
}

function parseResult(raw: string): AgentResult {
  const match = raw.match(JSON_BLOCK);
  if (!match) throw new Error('LLM response did not contain a JSON object');

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  return {
    reply: typeof parsed.reply === 'string' ? parsed.reply : '',
    user_type: typeof parsed.user_type === 'string' ? parsed.user_type : 'unknown',
    lead_data: normalizeLeadData(parsed.lead_data),
    lead_score: typeof parsed.lead_score === 'number' ? parsed.lead_score : 0,
    lead_status: typeof parsed.lead_status === 'string' ? parsed.lead_status : 'cold',
    next_action: typeof parsed.next_action === 'string' ? parsed.next_action : 'collect_info',
    needs_human_followup: parsed.needs_human_followup === true,
  };
}

function resultFromKnown(session: AgentSession): AgentResult {
  const score = computeScore(session.known);
  return {
    reply: HANDOFF_CLOSING,
    user_type: session.user_type,
    lead_data: { ...session.known, extra_info: {} },
    lead_score: score,
    lead_status: computeStatus(score),
    next_action: 'human_followup',
    needs_human_followup: true,
  };
}

async function getOrCreateSession(phone: string): Promise<AgentSession> {
  const cached = sessions.get(phone);
  if (cached) return cached;

  const stored = await loadAgentState(phone);
  const session: AgentSession = {
    history: deserializeHistory(stored.history),
    known: stored.known,
    needs_human_followup: stored.needs_human_followup,
    user_type: stored.user_type,
  };
  sessions.set(phone, session);
  return session;
}

async function persistSession(phone: string, session: AgentSession): Promise<void> {
  const state: StoredAgentState = {
    history: serializeHistory(session.history),
    known: session.known,
    needs_human_followup: session.needs_human_followup,
    user_type: session.user_type,
    updated_at: new Date().toISOString(),
  };
  await saveAgentState(phone, state);
}

interface BuiltContext {
  context: string;
  matchedCities: string[];
  knownCities: string[];
  matchedProperties: KnownProperty[];
}

async function buildContext(userMessage: string, known: KnownLead): Promise<BuiltContext> {
  const knownCities = await getKnownAreas();
  const matchedCities = detectMatchingAreas(userMessage, knownCities);

  let knownProperties: KnownProperty[] = [];
  try {
    knownProperties = await getKnownProperties();
  } catch (error) {
    console.error('[agent] property lookup failed', error);
  }
  const matchedProperties = detectMatchingProperties(userMessage, knownProperties);

  let docChunks: RetrievedChunk[] = [];
  try {
    docChunks = await retrieve(userMessage, config.agent.topK, {
      doc_type: DOC_TYPE_DOCUMENT,
    });
  } catch (error) {
    console.error('[agent] retrieval failed', error);
  }

  const areaValue = hasText(known.area) ? known.area : null;
  const storedCity = areaValue
    ? knownCities.find((city) => city.toLowerCase() === areaValue.toLowerCase())
    : undefined;
  const projectCities = [...new Set(matchedProperties.map((property) => property.city))].filter(
    (city) =>
      hasText(city) && knownCities.some((known) => known.toLowerCase() === city.toLowerCase())
  );
  const cities =
    matchedCities.length > 0 ? matchedCities : storedCity ? [storedCity] : projectCities;

  const propertyIds = matchedProperties.map((property) => property.id);
  const scopedToProperty = propertyIds.length > 0;

  let catalog: CatalogProperty[] = [];
  if (cities.length > 0) {
    const messageTypes = PROPERTY_TYPES.filter((type) =>
      new RegExp(`\\b${type}\\b`, 'i').test(userMessage)
    );
    const propertyType = hasText(known.property_type)
      ? known.property_type
      : messageTypes.length === 1
        ? messageTypes[0]
        : undefined;
    const maxPrice = parseBudgetToIdr(userMessage) ?? parseBudgetToIdr(known.budget);

    const fetchCatalog = (overrides: Partial<Parameters<typeof fetchListingCatalog>[0]>) =>
      fetchListingCatalog({
        cities,
        propertyIds: scopedToProperty ? propertyIds : undefined,
        propertyType,
        maxPrice,
        ...overrides,
      });

    try {
      catalog = await fetchCatalog({});
      if (catalog.length === 0) catalog = await fetchCatalog({ maxPrice: null });
      if (catalog.length === 0)
        catalog = await fetchCatalog({ maxPrice: null, propertyType: null });
      if (catalog.length === 0 && scopedToProperty) {
        catalog = await fetchListingCatalog({ cities });
      }
    } catch (error) {
      console.error('[agent] catalog failed', error);
    }
  }

  const parts: string[] = [];
  if (knownCities.length > 0) {
    parts.push(`[AVAILABLE AREAS]\n${knownCities.join(', ')}`);
  }
  if (docChunks.length > 0) {
    parts.push(
      `[KNOWLEDGE BASE]\n${docChunks.map((chunk) => chunk.content).join('\n')}\n[/KNOWLEDGE BASE]`
    );
  }
  if (catalog.length > 0) {
    parts.push(buildPropertyCatalogBlock(catalog));
    const totalUnits = catalog.reduce((total, property) => total + property.available_count, 0);
    if (wantsUnitDetail(userMessage, catalog) || totalUnits <= config.agent.unitDetailLimit) {
      parts.push(buildUnitDetailBlock(catalog, config.agent.unitDetailLimit));
    }
  }

  return { context: parts.join('\n\n'), matchedCities, knownCities, matchedProperties };
}

function buildAugmentedMessage(
  phone: string,
  name: string | undefined,
  message: string,
  known: KnownLead,
  ragContext: string
): string {
  const identity = `[Customer Phone: ${phone}] [Customer Name: ${name || 'unknown'}]`;
  const knownBlock = buildKnownDataBlock(known);
  const missing = missingFields(known);
  const schemaReminder = [
    '[SYSTEM REMINDER] Reply with ONLY a single valid JSON object (no markdown, no prose).',
    `Fields still missing: ${missing.length > 0 ? missing.join(', ') : 'none'}.`,
  ].join('\n');

  return [identity, knownBlock, ragContext, schemaReminder, message].filter(Boolean).join('\n\n');
}

export interface ProcessMessageInput {
  phone: string;
  name?: string;
  message: string;
}

export async function processMessage(input: ProcessMessageInput): Promise<AgentResult> {
  const { phone, name, message } = input;
  const session = await getOrCreateSession(phone);

  if (session.needs_human_followup) {
    const result = resultFromKnown(session);
    session.history.push(new HumanMessage(message));
    session.history.push(new AIMessage(result.reply));
    await persistSession(phone, session);
    return result;
  }

  const { context, matchedCities, knownCities } = await buildContext(message, session.known);
  const augmented = buildAugmentedMessage(phone, name, message, session.known, context);

  const messagesForLlm: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    ...session.history,
    new HumanMessage(augmented),
  ];

  let rawContent = '';
  let result: AgentResult;
  try {
    const response = await getLlm().invoke(messagesForLlm);
    rawContent =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    result = parseResult(rawContent);
  } catch (error) {
    console.error('[agent] LLM or parse error', error);
    result = fallbackResult('Maaf, sedang ada kendala teknis. Boleh ulangi pesan Anda?');
  }

  session.known = mergeLeadData(session.known, result.lead_data);
  session.known = normalizeArea(session.known, matchedCities, knownCities);
  result.lead_data = { ...result.lead_data, ...backfillLeadData(result.lead_data, session.known) };
  result.lead_data.area = session.known.area;
  result.lead_score = computeScore(session.known);
  result.lead_status = computeStatus(result.lead_score);

  const wasHandingOff = result.needs_human_followup;
  result = enforceHandoffGate(result);
  if (wasHandingOff && !result.needs_human_followup) {
    console.warn(
      `[agent] overriding premature handoff for ${phone} — missing budget/area/property_type.`
    );
  }

  if (!hasText(session.known.budget) && containsListingLines(result.reply)) {
    console.warn(`[agent] removing listings for ${phone} — budget is still unknown.`);
    result.reply = stripListingLines(
      result.reply,
      'Baik. Berapa anggaran yang Anda siapkan untuk properti ini?'
    );
    result.needs_human_followup = false;
    if (!result.next_action || result.next_action === 'human_followup') {
      result.next_action = 'collect_info';
    }
  }

  session.needs_human_followup = result.needs_human_followup;
  if (result.user_type && result.user_type !== 'unknown') {
    session.user_type = result.user_type;
  }
  result.user_type = session.user_type;

  session.history.push(new HumanMessage(message));
  session.history.push(new AIMessage(rawContent || result.reply));
  const maxMessages = config.agent.maxHistoryTurns * 2;
  if (session.history.length > maxMessages) {
    session.history = session.history.slice(-maxMessages);
  }

  await persistSession(phone, session);
  return result;
}

export async function resetSession(phone: string): Promise<void> {
  sessions.delete(phone);
  await clearAgentState(phone);
}
