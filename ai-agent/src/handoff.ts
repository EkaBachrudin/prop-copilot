import { hasText } from './leadState';

const HANDOFF_PHRASE_PATTERN = /[^.!\n]*menghubungi anda[^.!\n]*[.!]?/gi;

export interface HandoffResult {
  reply: string;
  lead_data: {
    budget?: string | null;
    area?: string | null;
    property_type?: string | null;
  };
  needs_human_followup?: boolean;
  next_action?: string;
}

export function containsHandoffPhrase(text: string): boolean {
  const fresh = new RegExp(HANDOFF_PHRASE_PATTERN.source, 'i');
  return fresh.test(text);
}

export function stripHandoffPhrase(text: string): string {
  return text
    .replace(new RegExp(HANDOFF_PHRASE_PATTERN.source, 'gi'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Handoff is only allowed when budget + area + property_type are all present. */
export function hasKeyInfo(leadData: HandoffResult['lead_data'] | null | undefined): boolean {
  if (!leadData) return false;
  return hasText(leadData.budget) && hasText(leadData.area) && hasText(leadData.property_type);
}

/**
 * Deterministic gate: if the LLM claims handoff without the required key data,
 * force it back to collect_info and remove any follow-up promise it wrote.
 */
export function enforceHandoffGate<T extends HandoffResult>(result: T): T {
  if (hasKeyInfo(result.lead_data)) return result;

  const overridden = result.needs_human_followup === true || containsHandoffPhrase(result.reply);
  if (!overridden) return result;

  return {
    ...result,
    needs_human_followup: false,
    next_action:
      !result.next_action || result.next_action === 'human_followup'
        ? 'collect_info'
        : result.next_action,
    reply: stripHandoffPhrase(result.reply),
  } as T;
}
