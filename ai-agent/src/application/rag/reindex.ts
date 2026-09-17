import { DOC_TYPE_DOCUMENT } from '../../domain/types';
import type { CatalogRepository } from '../ports/CatalogRepository';
import type { DocumentStore } from '../ports/DocumentStore';
import type { TextChunker } from '../ports/TextChunker';
import type { TextExtractor } from '../ports/TextExtractor';
import type { VectorStore } from '../ports/VectorStore';
import { embedListings } from './embedListings';
import { ingestDocument } from './ingestDocument';

export interface ReindexDeps {
  catalog: CatalogRepository;
  vectorStore: VectorStore;
  documents: DocumentStore;
  extractor: TextExtractor;
  chunker: TextChunker;
}

export interface ReindexResult {
  listings: number;
  documentChunks: number;
}

/** Idempotent full rebuild: listings + all uploaded documents. */
export async function reindex(deps: ReindexDeps): Promise<ReindexResult> {
  await deps.vectorStore.deleteByFilter({ doc_type: DOC_TYPE_DOCUMENT });

  const listings = await embedListings(deps.catalog, deps.vectorStore);

  const documents = await deps.documents.getForReindex();
  let documentChunks = 0;
  for (const doc of documents) {
    const text = await deps.extractor.extract(doc.pdf_data);
    if (!text) continue;
    documentChunks += await ingestDocument(
      { chunker: deps.chunker, vectorStore: deps.vectorStore },
      text,
      { refId: doc.id, source: doc.file_name }
    );
  }

  return { listings, documentChunks };
}
