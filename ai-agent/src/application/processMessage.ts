import {
  fallbackResult,
  parseResult,
  resultFromKnown,
} from '../domain/conversation/parseAgentResult';
import { SYSTEM_PROMPT } from '../domain/conversation/systemPrompt';
import { enforceHandoffGate } from '../domain/handoff/handoffGate';
import { backfillLeadData, hasText, mergeLeadData, normalizeArea } from '../domain/lead/leadData';
import { containsListingLines, stripListingLines } from '../domain/lead/listingGate';
import { computeScore, computeStatus } from '../domain/lead/scoring';
import type { AgentResult, AgentSession, StoredAgentState } from '../domain/types';
import { buildAugmentedMessage, buildContext } from './contextBuilder';
import type { CatalogRepository } from './ports/CatalogRepository';
import type { KnowledgeRepository } from './ports/KnowledgeRepository';
import type { LlmPort } from './ports/LlmPort';
import type { SessionRepository } from './ports/SessionRepository';

export interface ProcessMessageInput {
  phone: string;
  name?: string;
  message: string;
}

export interface AgentServiceOptions {
  topK: number;
  unitDetailLimit: number;
  maxHistoryTurns: number;
}

export interface AgentServiceDeps {
  llm: LlmPort;
  catalog: CatalogRepository;
  knowledge: KnowledgeRepository;
  sessions: SessionRepository;
  options: AgentServiceOptions;
}

export interface AgentService {
  processMessage(input: ProcessMessageInput): Promise<AgentResult>;
  resetSession(phone: string): Promise<void>;
}

export function createAgentService(deps: AgentServiceDeps): AgentService {
  const cache = new Map<string, AgentSession>();

  const getOrCreateSession = async (phone: string): Promise<AgentSession> => {
    const cached = cache.get(phone);
    if (cached) return cached;

    const stored = await deps.sessions.load(phone);
    const session: AgentSession = {
      history: stored.history,
      known: stored.known,
      needs_human_followup: stored.needs_human_followup,
      user_type: stored.user_type,
    };
    cache.set(phone, session);
    return session;
  };

  const persistSession = async (phone: string, session: AgentSession): Promise<void> => {
    const maxMessages = deps.options.maxHistoryTurns * 2;
    if (session.history.length > maxMessages) {
      session.history = session.history.slice(-maxMessages);
    }

    const state: StoredAgentState = {
      history: session.history,
      known: session.known,
      needs_human_followup: session.needs_human_followup,
      user_type: session.user_type,
      updated_at: new Date().toISOString(),
    };
    await deps.sessions.save(phone, state);
  };

  const processMessage = async (input: ProcessMessageInput): Promise<AgentResult> => {
    const { phone, name, message } = input;
    const session = await getOrCreateSession(phone);

    if (session.needs_human_followup) {
      const result = resultFromKnown(session);
      session.history.push({ role: 'human', content: message });
      session.history.push({ role: 'ai', content: result.reply });
      await persistSession(phone, session);
      return result;
    }

    const { context, matchedCities, knownCities } = await buildContext(
      {
        catalog: deps.catalog,
        knowledge: deps.knowledge,
        topK: deps.options.topK,
        unitDetailLimit: deps.options.unitDetailLimit,
      },
      message,
      session.known
    );
    const augmented = buildAugmentedMessage(phone, name, message, session.known, context);

    let rawContent = '';
    let result: AgentResult;
    try {
      rawContent = await deps.llm.generate({
        system: SYSTEM_PROMPT,
        history: session.history,
        user: augmented,
      });
      result = parseResult(rawContent);
    } catch (error) {
      console.error('[agent] LLM or parse error', error);
      result = fallbackResult();
    }

    session.known = mergeLeadData(session.known, result.lead_data);
    session.known = normalizeArea(session.known, matchedCities, knownCities);
    result.lead_data = {
      ...result.lead_data,
      ...backfillLeadData(result.lead_data, session.known),
    };
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

    session.history.push({ role: 'human', content: message });
    session.history.push({ role: 'ai', content: rawContent || result.reply });

    await persistSession(phone, session);
    return result;
  };

  const resetSession = async (phone: string): Promise<void> => {
    cache.delete(phone);
    await deps.sessions.clear(phone);
  };

  return { processMessage, resetSession };
}
