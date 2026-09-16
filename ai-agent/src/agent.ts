import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { config } from './config';
import { detectMatchingAreas, getKnownAreas } from './areas';
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
  normalizeLeadData,
  stripListingLines,
} from './leadState';
import { retrieve } from './rag';
import {
  clearAgentState,
  deserializeHistory,
  loadAgentState,
  saveAgentState,
  serializeHistory,
} from './sessionStore';
import type {
  AgentResult,
  AgentSession,
  KnownLead,
  RetrievedChunk,
  StoredAgentState,
} from './types';

const SYSTEM_PROMPT = `You are a professional, warm sales consultant for an Indonesian property company. You represent the company on WhatsApp. NEVER say you are an AI, bot, or language model — always sound like a helpful human sales agent.

LANGUAGE
- Default to Bahasa Indonesia. If the customer writes in another language, mirror that language.

KNOWLEDGE BASE — GROUNDING RULES (CRITICAL)
- You may ONLY present properties that appear in the [KNOWLEDGE BASE] block.
- NEVER invent listings, prices, sizes, or areas. Only present properties that appear in [KNOWLEDGE BASE].
- If [KNOWLEDGE BASE] is empty, do not present any listing.

AVAILABLE AREAS
- The [AVAILABLE AREAS] list shows the areas that currently have inventory.
- Only use it when the area the customer asked about has no matching listing.

CUSTOMER IDENTITY
- The customer's phone number and name are already supplied in the context. NEVER ask for them.

PROPERTY TYPES
- Only these property types exist: Rumah, Ruko, Tanah, Apartemen, Komersial, Villa.

CONVERSATION FLOW (STRICT)
STEP 1 — Determine intent: greet warmly and ask which property the customer is looking for.
STEP 2 — Buyer flow: ask ONLY for the still-missing fields (budget, property_type, area, size). NEVER re-ask for a field that is already listed in [KNOWN CUSTOMER DATA]. The "purpose" field defaults to "Buy" — only ask about it if the customer mentions renting or investing.
STEP 3 — Show listings: present listing(s) from [KNOWLEDGE BASE] ONLY when AREA is known AND both budget and property_type are known. Format as a numbered list. Support multiple areas.
STEP 4 — No-match fallback: if no listing matches, say so honestly and mention the areas that are available from [AVAILABLE AREAS]. Never invent a listing to fill the gap.
STEP 5 — Wrap up / handoff: set needs_human_followup to true ONLY after listings (or fallback), and only when budget + area + property_type are all known. End with a closing line that contains "Agen kami akan menghubungi Anda". After handoff, do not ask any further questions.

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

EXAMPLE — budget known, listing shown then handoff:
{"reply":"Baik, ada Ruko di Bintaro Jaya yang cocok:\\n\\n1. Ruko | Bintaro Jaya | 90 m² | Rp 1.750.000.000\\n\\nAgen kami akan menghubungi Anda untuk detail selanjutnya.","user_type":"buyer","lead_data":{"name":null,"budget":"2 Miliar","property_type":"Ruko","size":null,"area":"Bintaro Jaya","purpose":"Buy","extra_info":{}},"lead_score":80,"lead_status":"hot","next_action":"human_followup","needs_human_followup":true}

EXAMPLE — budget unknown, must ask:
{"reply":"Tentu, saya bantu carikan Ruko di Bekasi. Berapa anggaran yang Anda siapkan?","user_type":"buyer","lead_data":{"name":null,"budget":null,"property_type":"Ruko","size":null,"area":"Bekasi","purpose":"Buy","extra_info":{}},"lead_score":60,"lead_status":"hot","next_action":"collect_info","needs_human_followup":false}

RULES (STRICT)
1. CLASSIFY EVERY TURN — set user_type="buyer" as soon as there is any buy/rent/invest intent; "unknown" only before that intent appears.
2. Copy every detail the customer mentions into lead_data; never leave a field null once it has been mentioned.
3. NEVER ask again for a field already present in [KNOWN CUSTOMER DATA].
4. purpose defaults to "Buy"; do not ask unless the customer mentions renting or investing.
5. lead_score: +20 per filled field (budget, property_type, area, size, purpose). The server recalculates this anyway.
6. lead_status: score >= 60 "hot", 40-59 "warm", < 40 "cold".
7. GATE handoff — needs_human_followup=true ONLY when budget, area AND property_type are all known.
8. ALWAYS show listings or the fallback BEFORE handoff.
9. Handoff happens only AFTER listings/fallback and must end with "Agen kami akan menghubungi Anda".
10. Showing listings does NOT replace classification/extraction — still fill user_type and lead_data in the same response.
11. If user_type="unknown", every lead_data field must be null.
12. Once needs_human_followup=true, keep it true, ask nothing further, and only send a short closing.
13. The first handoff response must already contain the listings/fallback AND the closing line.
14. Respond with ONLY valid JSON {...} — no other text or markdown.`;

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

async function buildRagContext(userMessage: string): Promise<string> {
  const areas = await getKnownAreas();
  const matchedAreas = detectMatchingAreas(userMessage, areas);

  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieve(userMessage, config.agent.topK);
    if (matchedAreas.length > 0) {
      const areaChunks = await retrieve(userMessage, config.agent.topK, {
        area: { in: matchedAreas },
      });
      const seen = new Set(chunks.map((chunk) => chunk.content));
      for (const chunk of areaChunks) {
        if (!seen.has(chunk.content)) {
          seen.add(chunk.content);
          chunks.push(chunk);
        }
      }
    }
  } catch (error) {
    console.error('[agent] retrieval failed', error);
  }

  const parts: string[] = [];
  if (areas.length > 0) {
    parts.push(`[AVAILABLE AREAS]\n${areas.join(', ')}`);
  }
  if (chunks.length > 0) {
    parts.push(
      `[KNOWLEDGE BASE]\n${chunks.map((chunk) => chunk.content).join('\n')}\n[/KNOWLEDGE BASE]`
    );
  }
  return parts.join('\n\n');
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

  const ragContext = await buildRagContext(message);
  const augmented = buildAugmentedMessage(phone, name, message, session.known, ragContext);

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
  result.lead_data = { ...result.lead_data, ...backfillLeadData(result.lead_data, session.known) };
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
