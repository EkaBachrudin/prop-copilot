import type { StoredAgentState } from '../../domain/types';

export interface SessionRepository {
  load(phone: string): Promise<StoredAgentState>;
  save(phone: string, state: StoredAgentState): Promise<void>;
  clear(phone: string): Promise<void>;
}
