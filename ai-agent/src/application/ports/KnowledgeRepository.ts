import type { RetrievedChunk } from '../../domain/types';

export interface KnowledgeRepository {
  retrieve(query: string, k: number, filter?: Record<string, unknown>): Promise<RetrievedChunk[]>;
}
