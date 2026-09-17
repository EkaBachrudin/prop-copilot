import type { Express } from 'express';
import { createAgentService, type AgentService } from '../application/processMessage';
import { getKnowledgeStats } from '../application/rag/getStats';
import { ingestDocument } from '../application/rag/ingestDocument';
import { reindex } from '../application/rag/reindex';
import { uploadDocument } from '../application/rag/uploadDocument';
import { DOC_TYPE_DOCUMENT } from '../domain/types';
import { config } from '../infrastructure/config';
import { closePool, ensureVectorExtension, testConnection } from '../infrastructure/db';
import { PgVectorKnowledgeRepository } from '../infrastructure/knowledge/pgVectorKnowledgeRepository';
import { closeVectorStore, getVectorStore } from '../infrastructure/knowledge/vectorStore';
import { OpenAiLlm } from '../infrastructure/llm/openAiLlm';
import { PgCatalogRepository } from '../infrastructure/persistence/pgCatalogRepository';
import { PgDocumentStore } from '../infrastructure/persistence/pgDocumentStore';
import { PgSessionRepository } from '../infrastructure/persistence/pgSessionRepository';
import { PdfTextExtractor } from '../infrastructure/pdf/pdfTextExtractor';
import { RecursiveTextChunker } from '../infrastructure/text/recursiveTextChunker';
import { createApp, type RagHandlers } from '../presentation/http/routes';

export interface Container {
  app: Express;
  agent: AgentService;
  rag: RagHandlers;
  startup(): Promise<void>;
  shutdown(): Promise<void>;
}

export function createContainer(): Container {
  const vectorStore = new PgVectorKnowledgeRepository();
  const documents = new PgDocumentStore();
  const extractor = new PdfTextExtractor();
  const chunker = new RecursiveTextChunker({
    chunkSize: config.chunk.size,
    chunkOverlap: config.chunk.overlap,
  });
  const catalog = new PgCatalogRepository();
  const sessions = new PgSessionRepository(config.agent.maxHistoryTurns * 2);
  const llm = new OpenAiLlm({
    model: config.openai.model,
    apiKey: config.openai.apiKey,
    temperature: 0.4,
  });

  const agent = createAgentService({
    llm,
    catalog,
    knowledge: vectorStore,
    sessions,
    options: {
      topK: config.agent.topK,
      unitDetailLimit: config.agent.unitDetailLimit,
      maxHistoryTurns: config.agent.maxHistoryTurns,
    },
  });

  const rag: RagHandlers = {
    search: (query, k) => vectorStore.retrieve(query, k),
    listDocuments: () => documents.list(),
    uploadDocument: (file) =>
      uploadDocument(
        {
          documents,
          extractor,
          ingest: (text, options) => ingestDocument({ chunker, vectorStore }, text, options),
        },
        file
      ),
    deleteDocument: async (id) => {
      await vectorStore.deleteByFilter({ doc_type: DOC_TYPE_DOCUMENT, ref_id: id });
      const deleted = await documents.delete(id);
      return { id, deleted };
    },
    stats: () => getKnowledgeStats(documents, vectorStore),
    reindex: () => reindex({ catalog, vectorStore, documents, extractor, chunker }),
  };

  const app = createApp({ agent, rag });

  return {
    app,
    agent,
    rag,
    async startup() {
      const connected = await testConnection();
      if (!connected) throw new Error('database unreachable');

      try {
        await ensureVectorExtension();
        await getVectorStore();
        console.log('[ai-agent] vector store ready');
      } catch (error) {
        console.error('[ai-agent] vector store init failed', error);
      }
    },
    async shutdown() {
      const storeClosed = await closeVectorStore();
      if (!storeClosed) await closePool();
    },
  };
}
