import type { ChatPrompt } from '../../domain/conversation/ChatPrompt';

export interface LlmPort {
  generate(prompt: ChatPrompt): Promise<string>;
}
