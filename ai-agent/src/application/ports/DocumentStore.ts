import type { DocumentRow } from '../../domain/types';

export interface ReindexDocument {
  id: string;
  file_name: string;
  pdf_data: Uint8Array;
}

export interface DocumentStore {
  list(): Promise<DocumentRow[]>;
  insert(fileName: string, pdfData: Uint8Array): Promise<DocumentRow>;
  delete(id: string): Promise<boolean>;
  getForReindex(): Promise<ReindexDocument[]>;
}
