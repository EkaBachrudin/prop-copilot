import { DOC_TYPE_DOCUMENT, DOC_TYPE_INVENTORY, type RagStats } from '../../domain/types';
import type { DocumentStore } from '../ports/DocumentStore';
import type { VectorStore } from '../ports/VectorStore';

/** Read-only counts backing the Knowledge Base dashboard. */
export async function getKnowledgeStats(
  documents: DocumentStore,
  vectorStore: VectorStore
): Promise<RagStats> {
  const embeddingCounts = await vectorStore.countByDocType();

  let inventory = 0;
  let documentChunks = 0;
  for (const row of embeddingCounts) {
    if (row.doc_type === DOC_TYPE_INVENTORY) inventory += row.count;
    if (row.doc_type === DOC_TYPE_DOCUMENT) documentChunks += row.count;
  }

  const documentRows = await documents.list();

  return {
    inventory,
    documentChunks,
    documents: documentRows.length,
  };
}
