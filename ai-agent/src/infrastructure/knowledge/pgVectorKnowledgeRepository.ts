import { Document } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';
import type { KnowledgeRepository } from '../../application/ports/KnowledgeRepository';
import type { DocTypeCount, VectorStore } from '../../application/ports/VectorStore';
import { sanitizeMetadata } from '../../domain/knowledge/sanitizeMetadata';
import type { RetrievedChunk, StoredDocument } from '../../domain/types';
import { config } from '../config';
import { pool } from '../db';
import { getVectorStore } from './vectorStore';

const BATCH_SIZE = 100;

export class PgVectorKnowledgeRepository implements KnowledgeRepository, VectorStore {
  async retrieve(
    query: string,
    k: number,
    filter?: Record<string, unknown>
  ): Promise<RetrievedChunk[]> {
    const store = await getVectorStore();
    const results = await store.similaritySearchWithScore(
      query,
      k,
      filter as PGVectorStore['FilterType']
    );
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata as Record<string, unknown>,
      score,
    }));
  }

  async addDocuments(docs: StoredDocument[]): Promise<void> {
    if (docs.length === 0) return;
    const store = await getVectorStore();
    const langchainDocs = docs.map(
      (doc) =>
        new Document({
          pageContent: doc.content,
          metadata: sanitizeMetadata(doc.metadata),
        })
    );

    for (let index = 0; index < langchainDocs.length; index += BATCH_SIZE) {
      await store.addDocuments(langchainDocs.slice(index, index + BATCH_SIZE));
    }
  }

  async deleteByFilter(filter: Record<string, unknown>): Promise<void> {
    const store = await getVectorStore();
    await store.delete({ filter: filter as PGVectorStore['FilterType'] });
  }

  async countByDocType(): Promise<DocTypeCount[]> {
    const result = await pool.query<DocTypeCount>(
      `SELECT metadata->>'doc_type' AS doc_type, count(*)::int AS count
       FROM "${config.vector.tableName}"
       GROUP BY 1`
    );
    return result.rows;
  }
}
