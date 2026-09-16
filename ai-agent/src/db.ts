import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('[db] unexpected idle client error', error);
});

/** The RAG vector store requires the pgvector extension (idempotent). */
export const ensureVectorExtension = async (): Promise<void> => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log('[db] connected at', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[db] connection failed', error);
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};
