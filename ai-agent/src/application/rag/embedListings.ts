import { listingToDocument } from '../../domain/catalog/listingDocument';
import { DOC_TYPE_INVENTORY } from '../../domain/types';
import type { CatalogRepository } from '../ports/CatalogRepository';
import type { VectorStore } from '../ports/VectorStore';

/** Re-embed all available listings (deletes previous inventory vectors first). */
export async function embedListings(
  catalog: CatalogRepository,
  vectorStore: VectorStore
): Promise<number> {
  const rows = await catalog.fetchAvailableUnits();
  await vectorStore.deleteByFilter({ doc_type: DOC_TYPE_INVENTORY });
  if (rows.length === 0) return 0;

  const docs = rows.map(listingToDocument);
  await vectorStore.addDocuments(docs);
  return docs.length;
}
