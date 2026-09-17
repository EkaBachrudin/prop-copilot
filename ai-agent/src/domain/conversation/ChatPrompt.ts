import type { ConversationTurn } from '../types';

/** Framework-agnostic prompt handed to an LLM adapter. */
export interface ChatPrompt {
  system: string;
  history: ConversationTurn[];
  user: string;
}
