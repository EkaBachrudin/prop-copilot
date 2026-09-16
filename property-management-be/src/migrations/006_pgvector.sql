-- Migration: 006_pgvector
-- Description: Enable the pgvector extension used by the RAG knowledge base.
--              The LangChain PGVectorStore creates its own embedding tables
--              lazily on first use, so only the extension is created here.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
