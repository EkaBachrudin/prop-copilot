import { sanitizeMetadata } from '../../domain/knowledge/sanitizeMetadata';
import { DOC_TYPE_DOCUMENT, type StoredDocument } from '../../domain/types';
import type { TextChunker } from '../ports/TextChunker';
import type { VectorStore } from '../ports/VectorStore';

export interface IngestDocumentDeps {
  chunker: TextChunker;
  vectorStore: VectorStore;
}

export interface IngestDocumentOptions {
  refId: string;
  source: string;
}

/** Chunk + embed a non-inventory document. */
export async function ingestDocument(
  deps: IngestDocumentDeps,
  text: string,
  options: IngestDocumentOptions
): Promise<number> {
  const chunks = await deps.chunker.split(text);
  if (chunks.length === 0) return 0;

  const docs: StoredDocument[] = chunks.map((chunk, index) => ({
    content: chunk,
    metadata: sanitizeMetadata({
      doc_type: DOC_TYPE_DOCUMENT,
      ref_id: options.refId,
      source: options.source,
      chunk_index: index,
    }),
  }));

  await deps.vectorStore.addDocuments(docs);
  return docs.length;
}
