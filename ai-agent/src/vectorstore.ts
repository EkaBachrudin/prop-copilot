import { OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/pgvector';
import { config } from './config';
import { pool } from './db';

let storePromise: Promise<PGVectorStore> | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    model: config.openai.embeddingModel,
    dimensions: config.openai.embeddingDimensions,
    apiKey: config.openai.apiKey,
  });
}

/**
 * Lazily initialise the pgvector-backed store. Initialisation creates the
 * embedding + collection tables when missing. The HNSW index is created once
 * and any "already exists" error is ignored.
 */
export function getVectorStore(): Promise<PGVectorStore> {
  if (!storePromise) {
    storePromise = PGVectorStore.initialize(getEmbeddings(), {
      pool,
      tableName: config.vector.tableName,
      collectionTableName: config.vector.collectionTableName,
      collectionName: config.vector.collectionName,
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: 'cosine',
      scoreNormalization: 'similarity',
      dimensions: config.openai.embeddingDimensions,
    })
      .then(async (store) => {
        try {
          await store.createHnswIndex({ dimensions: config.openai.embeddingDimensions });
        } catch (error) {
          console.warn(
            '[vectorstore] HNSW index skipped (may already exist):',
            (error as Error).message
          );
        }
        return store;
      })
      .catch((error) => {
        storePromise = null;
        throw error;
      });
  }

  return storePromise;
}

/**
 * Releases the client held by the vector store. PGVectorStore checks out a
 * dedicated client on init and only returns it via `end()`, which also ends the
 * shared pool. Returns true when a store was closed (and the pool ended).
 */
export async function closeVectorStore(): Promise<boolean> {
  if (!storePromise) return false;

  const store = await storePromise.catch(() => null);
  storePromise = null;
  if (!store) return false;

  await store.end();
  return true;
}
