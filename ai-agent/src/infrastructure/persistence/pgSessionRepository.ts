import type { SessionRepository } from '../../application/ports/SessionRepository';
import { emptyKnownLead, normalizeKnownLead } from '../../domain/lead/leadData';
import type { ConversationTurn, StoredAgentState } from '../../domain/types';
import { pool } from '../db';

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly maxHistoryMessages: number) {}

  private defaultState(): StoredAgentState {
    return {
      history: [],
      known: emptyKnownLead(),
      needs_human_followup: false,
      user_type: 'unknown',
      updated_at: new Date().toISOString(),
    };
  }

  private normalizeHistory(raw: unknown): ConversationTurn[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const entry = item as { role?: unknown; content?: unknown };
        const role: ConversationTurn['role'] = entry.role === 'ai' ? 'ai' : 'human';
        const content = typeof entry.content === 'string' ? entry.content : '';
        return { role, content };
      })
      .filter((entry) => entry.content.length > 0)
      .slice(-this.maxHistoryMessages);
  }

  private normalizeState(raw: unknown): StoredAgentState {
    const defaults = this.defaultState();
    if (!raw || typeof raw !== 'object') return defaults;

    const source = raw as Record<string, unknown>;
    return {
      history: this.normalizeHistory(source.history),
      known: normalizeKnownLead(source.known ?? source.known_lead),
      needs_human_followup: source.needs_human_followup === true,
      user_type: typeof source.user_type === 'string' ? source.user_type : 'unknown',
      updated_at: typeof source.updated_at === 'string' ? source.updated_at : defaults.updated_at,
    };
  }

  async load(phone: string): Promise<StoredAgentState> {
    const result = await pool.query<{ agent_state: unknown }>(
      'SELECT agent_state FROM conversations WHERE phone = $1',
      [phone]
    );
    if (result.rows.length === 0) return this.defaultState();
    return this.normalizeState(result.rows[0].agent_state);
  }

  async save(phone: string, state: StoredAgentState): Promise<void> {
    const payload = JSON.stringify({ ...state, updated_at: new Date().toISOString() });
    await pool.query(
      `INSERT INTO conversations (phone, agent_state, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())
       ON CONFLICT (phone)
       DO UPDATE SET agent_state = EXCLUDED.agent_state, updated_at = NOW()`,
      [phone, payload]
    );
  }

  async clear(phone: string): Promise<void> {
    await pool.query(
      'UPDATE conversations SET agent_state = NULL, updated_at = NOW() WHERE phone = $1',
      [phone]
    );
  }
}
