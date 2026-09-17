import type { DocumentRow } from '../../domain/types';
import { AppError } from '../errors';
import type { DocumentStore } from '../ports/DocumentStore';
import type { TextExtractor } from '../ports/TextExtractor';

export interface UploadDocumentDeps {
  documents: DocumentStore;
  extractor: TextExtractor;
  ingest: (text: string, options: { refId: string; source: string }) => Promise<number>;
}

export interface UploadDocumentInput {
  fileName: string;
  data: Uint8Array;
}

export interface UploadDocumentResult {
  document: DocumentRow;
  chunks: number;
}

/** Extract text, persist the original PDF, then chunk + embed it (rollback on failure). */
export async function uploadDocument(
  deps: UploadDocumentDeps,
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const text = await deps.extractor.extract(input.data);
  if (!text) {
    throw new AppError('No extractable text found in the PDF');
  }

  const document = await deps.documents.insert(input.fileName, input.data);
  try {
    const chunks = await deps.ingest(text, {
      refId: document.id,
      source: document.file_name,
    });
    return { document, chunks };
  } catch (error) {
    await deps.documents.delete(document.id);
    throw error;
  }
}
