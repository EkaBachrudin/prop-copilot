import { AgentResponsePayload } from '../types';

const agentBaseUrl = (): string => process.env.AI_AGENT_URL || 'http://127.0.0.1:8080';

export interface AgentRequest {
  phone: string;
  name?: string;
  message: string;
}

/** Calls the ai-agent `POST /message` endpoint. Returns null when unreachable. */
export const callAgent = async (payload: AgentRequest): Promise<AgentResponsePayload | null> => {
  try {
    const response = await fetch(`${agentBaseUrl()}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[agent] request failed', response.status, await response.text());
      return null;
    }

    return (await response.json()) as AgentResponsePayload;
  } catch (error) {
    console.error('[agent] unreachable', error);
    return null;
  }
};

/** Clears the ai-agent in-memory + persisted session for a phone number. */
export const resetAgentSession = async (phone: string): Promise<void> => {
  try {
    await fetch(`${agentBaseUrl()}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
  } catch (error) {
    console.error('[agent] reset failed', error);
  }
};
