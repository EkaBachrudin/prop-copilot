import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { PGVectorStore } from '@langchain/pgvector';
import { config } from './config';
import { pool } from './db';
import { getDocumentsForReindex } from './documents';
import { extractPdfText } from './pdfText';
import type { ListingRow, RetrievedChunk } from './types';
import { getVectorStore } from './vectorstore';

export const DOC_TYPE_INVENTORY = 'inventory';
export const DOC_TYPE_DOCUMENT = 'document';

const BATCH_SIZE = 100;

export function formatPrice(value: string | number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

async function addInBatches(store: PGVectorStore, docs: Document[]): Promise<void> {
  for (let index = 0; index < docs.length; index += BATCH_SIZE) {
    await store.addDocuments(docs.slice(index, index + BATCH_SIZE));
  }
}

/** Available units joined with their block/property become listing documents. */
export async function fetchListings(): Promise<ListingRow[]> {
  const result = await pool.query<ListingRow>(
    `SELECT u.id AS unit_id,
            u.name AS unit_name,
            b.id AS block_id,
            b.name AS block_name,
            p.id AS property_id,
            p.name AS property_name,
            p.city AS area,
            p.address,
            u.property_type,
            u.land_area,
            u.price,
            u.status,
            p.description
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     JOIN properties p ON p.id = b.property_id
     WHERE p.is_active = true
       AND u.status = 'available'
       AND u.property_type IS NOT NULL
       AND u.price IS NOT NULL
     ORDER BY p.city, p.name, b.name, u.name`
  );
  return result.rows;
}

export function listingToDocument(row: ListingRow): Document {
  const size = row.land_area !== null ? `${row.land_area} m²` : 'N/A';
  const content = [
    `Property: ${row.property_type}`,
    `City: ${row.area}`,
    `Size: ${size}`,
    `Price: ${formatPrice(row.price)}`,
    `Project: ${row.property_name} (${row.block_name} - Unit ${row.unit_name})`,
    `Description: ${row.description ?? '-'}`,
  ].join(' | ');

  return new Document({
    pageContent: content,
    metadata: sanitizeMetadata({
      doc_type: DOC_TYPE_INVENTORY,
      ref_id: row.unit_id,
      area: row.area,
      property_type: row.property_type ?? '',
      size: row.land_area === null ? '' : String(row.land_area),
      price: row.price === null ? 0 : Number(row.price),
      property_name: row.property_name,
      block_name: row.block_name,
      unit_name: row.unit_name,
      status: row.status,
    }),
  });
}

/** Re-embed all listings (deletes previous inventory vectors first). */
export async function embedListings(): Promise<number> {
  const store = await getVectorStore();
  const rows = await fetchListings();

  await store.delete({ filter: { doc_type: DOC_TYPE_INVENTORY } });
  if (rows.length === 0) return 0;

  const docs = rows.map(listingToDocument);
  await addInBatches(store, docs);
  return docs.length;
}

/** Chunk + embed a non-inventory document (PDF text). */
export async function ingestDocumentText(
  text: string,
  options: { refId: string; source: string }
): Promise<number> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunk.size,
    chunkOverlap: config.chunk.overlap,
  });
  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) return 0;

  const store = await getVectorStore();
  const docs = chunks.map(
    (chunk, index) =>
      new Document({
        pageContent: chunk,
        metadata: sanitizeMetadata({
          doc_type: DOC_TYPE_DOCUMENT,
          ref_id: options.refId,
          source: options.source,
          chunk_index: index,
        }),
      })
  );
  await addInBatches(store, docs);
  return docs.length;
}

export async function retrieve(
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

export async function removeDocumentEmbeddings(refId: string): Promise<void> {
  const store = await getVectorStore();
  await store.delete({ filter: { doc_type: DOC_TYPE_DOCUMENT, ref_id: refId } });
}

/** Idempotent full rebuild: listings + all uploaded documents. */
export async function reindex(): Promise<{ listings: number; documentChunks: number }> {
  const store = await getVectorStore();
  await store.delete({ filter: { doc_type: DOC_TYPE_DOCUMENT } });

  const listings = await embedListings();

  const documents = await getDocumentsForReindex();
  let documentChunks = 0;
  for (const doc of documents) {
    const text = await extractPdfText(doc.pdf_data);
    if (!text) continue;
    documentChunks += await ingestDocumentText(text, {
      refId: doc.id,
      source: doc.file_name,
    });
  }

  return { listings, documentChunks };
}

export interface RagStats {
  inventory: number;
  documentChunks: number;
  documents: number;
}

/** Read-only counts backing the Knowledge Base dashboard. */
export async function getRagStats(): Promise<RagStats> {
  const embeddingCounts = await pool.query<{ doc_type: string | null; count: number }>(
    `SELECT metadata->>'doc_type' AS doc_type, count(*)::int AS count
     FROM "${config.vector.tableName}"
     GROUP BY 1`
  );
  const documentCount = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM documents'
  );

  let inventory = 0;
  let documentChunks = 0;
  for (const row of embeddingCounts.rows) {
    if (row.doc_type === DOC_TYPE_INVENTORY) inventory += row.count;
    if (row.doc_type === DOC_TYPE_DOCUMENT) documentChunks += row.count;
  }

  return {
    inventory,
    documentChunks,
    documents: documentCount.rows[0]?.count ?? 0,
  };
}
