import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { config } from './config';
import { pool } from './db';
import { emptyKnownLead, normalizeKnownLead } from './leadState';
import type { StoredAgentState } from './types';

const MAX_HISTORY_MESSAGES = config.agent.maxHistoryTurns * 2;

export const defaultAgentState = (): StoredAgentState => ({
  history: [],
  known: emptyKnownLead(),
  needs_human_followup: false,
  user_type: 'unknown',
  updated_at: new Date().toISOString(),
});

function normalizeHistory(raw: unknown): StoredAgentState['history'] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const entry = item as { role?: unknown; content?: unknown };
      const role: 'human' | 'ai' = entry.role === 'ai' ? 'ai' : 'human';
      const content = typeof entry.content === 'string' ? entry.content : '';
      return { role, content };
    })
    .filter((entry) => entry.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

export function normalizeAgentState(raw: unknown): StoredAgentState {
  const defaults = defaultAgentState();
  if (!raw || typeof raw !== 'object') return defaults;

  const source = raw as Record<string, unknown>;
  return {
    history: normalizeHistory(source.history),
    known: normalizeKnownLead(source.known ?? source.known_lead),
    needs_human_followup: source.needs_human_followup === true,
    user_type: typeof source.user_type === 'string' ? source.user_type : 'unknown',
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : defaults.updated_at,
  };
}

export function serializeHistory(messages: BaseMessage[]): StoredAgentState['history'] {
  return messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.getType() === 'ai' ? 'ai' : 'human',
    content:
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
  }));
}

export function deserializeHistory(history: StoredAgentState['history']): BaseMessage[] {
  return history.map((entry) =>
    entry.role === 'ai' ? new AIMessage(entry.content) : new HumanMessage(entry.content)
  );
}

export async function loadAgentState(phone: string): Promise<StoredAgentState> {
  const result = await pool.query<{ agent_state: unknown }>(
    'SELECT agent_state FROM conversations WHERE phone = $1',
    [phone]
  );
  if (result.rows.length === 0) return defaultAgentState();
  return normalizeAgentState(result.rows[0].agent_state);
}

export async function saveAgentState(phone: string, state: StoredAgentState): Promise<void> {
  const payload = JSON.stringify({ ...state, updated_at: new Date().toISOString() });
  await pool.query(
    `INSERT INTO conversations (phone, agent_state, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())
     ON CONFLICT (phone)
     DO UPDATE SET agent_state = EXCLUDED.agent_state, updated_at = NOW()`,
    [phone, payload]
  );
}

export async function clearAgentState(phone: string): Promise<void> {
  await pool.query(
    'UPDATE conversations SET agent_state = NULL, updated_at = NOW() WHERE phone = $1',
    [phone]
  );
}
