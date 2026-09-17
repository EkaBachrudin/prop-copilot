import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { LlmPort } from '../../application/ports/LlmPort';
import type { ChatPrompt } from '../../domain/conversation/ChatPrompt';

export interface OpenAiLlmOptions {
  model: string;
  apiKey: string;
  temperature?: number;
}

export class OpenAiLlm implements LlmPort {
  private readonly llm: ChatOpenAI;

  constructor(options: OpenAiLlmOptions) {
    this.llm = new ChatOpenAI({
      model: options.model,
      temperature: options.temperature ?? 0.4,
      apiKey: options.apiKey,
    });
  }

  async generate(prompt: ChatPrompt): Promise<string> {
    const messages = [
      new SystemMessage(prompt.system),
      ...prompt.history.map((turn) =>
        turn.role === 'ai' ? new AIMessage(turn.content) : new HumanMessage(turn.content)
      ),
      new HumanMessage(prompt.user),
    ];

    const response = await this.llm.invoke(messages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }
}
