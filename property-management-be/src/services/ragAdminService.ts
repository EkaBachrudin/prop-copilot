import { AppError } from '../utils/AppError';

const agentBaseUrl = (): string => process.env.AI_AGENT_URL || 'http://127.0.0.1:8080';

interface AgentEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const requestAgent = async (path: string, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(`${agentBaseUrl()}${path}`, init);
  } catch (error) {
    console.error('[rag] ai-agent unreachable', error);
    throw new AppError('AI agent is not reachable', 502, 'AGENT_UNREACHABLE');
  }
};

const parse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as AgentEnvelope<T>;
  if (!response.ok) {
    throw new AppError(
      payload?.error?.message || 'AI agent request failed',
      response.status >= 400 && response.status < 600 ? response.status : 502,
      'AGENT_ERROR'
    );
  }
  return payload.data as T;
};

export const listRagDocuments = async (): Promise<{ documents: unknown[] }> => {
  const response = await requestAgent('/api/rag/documents');
  return parse<{ documents: unknown[] }>(response);
};

export const getRagStats = async (): Promise<{
  inventory: number;
  documentChunks: number;
  documents: number;
}> => {
  const response = await requestAgent('/api/rag/stats');
  return parse<{ inventory: number; documentChunks: number; documents: number }>(response);
};

export const deleteRagDocument = async (id: string): Promise<{ id: string }> => {
  const response = await requestAgent(`/api/rag/documents/${id}`, { method: 'DELETE' });
  return parse<{ id: string }>(response);
};

export const searchRag = async (
  query: string,
  k?: number
): Promise<{ results: unknown[] }> => {
  const response = await requestAgent('/api/rag/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, k }),
  });
  return parse<{ results: unknown[] }>(response);
};

export const reindexRag = async (): Promise<{ listings: number; documentChunks: number }> => {
  const response = await requestAgent('/api/rag/reindex', { method: 'POST' });
  return parse<{ listings: number; documentChunks: number }>(response);
};

export const uploadRagDocument = async (file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}): Promise<{ document: unknown; chunks: number }> => {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
    file.originalname
  );

  const response = await requestAgent('/api/rag/upload', { method: 'POST', body: form });
  return parse<{ document: unknown; chunks: number }>(response);
};
