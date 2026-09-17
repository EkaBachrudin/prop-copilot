import type { StoredDocument } from '../../domain/types';

export interface DocTypeCount {
  doc_type: string | null;
  count: number;
}

export interface VectorStore {
  addDocuments(docs: StoredDocument[]): Promise<void>;
  deleteByFilter(filter: Record<string, unknown>): Promise<void>;
  countByDocType(): Promise<DocTypeCount[]>;
}
