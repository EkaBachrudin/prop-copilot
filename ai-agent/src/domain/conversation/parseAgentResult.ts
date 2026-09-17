import { emptyLeadData, normalizeLeadData } from '../lead/leadData';
import { computeScore, computeStatus } from '../lead/scoring';
import type { AgentResult, AgentSession } from '../types';
import { HANDOFF_CLOSING, JSON_BLOCK } from './systemPrompt';

export const FALLBACK_REPLY = 'Maaf, sedang ada kendala teknis. Boleh ulangi pesan Anda?';

export function fallbackResult(reply: string = FALLBACK_REPLY): AgentResult {
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

export function parseResult(raw: string): AgentResult {
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

export function resultFromKnown(session: AgentSession): AgentResult {
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
