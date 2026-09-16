import dotenv from 'dotenv';

dotenv.config();

const int = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 8080),

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimensions: int(process.env.EMBEDDING_DIMENSIONS, 1536),
  },

  agent: {
    topK: int(process.env.AGENT_TOP_K, 12),
    maxHistoryTurns: int(process.env.MAX_HISTORY_TURNS, 20),
  },

  chunk: {
    size: int(process.env.CHUNK_SIZE, 1000),
    overlap: int(process.env.CHUNK_OVERLAP, 200),
  },

  vector: {
    tableName: process.env.VECTOR_TABLE || 'rag_embeddings',
    collectionTableName: process.env.VECTOR_COLLECTION_TABLE || 'rag_collections',
    collectionName: process.env.VECTOR_COLLECTION || 'lcm',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: int(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'property_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
} as const;

export type AppConfig = typeof config;
