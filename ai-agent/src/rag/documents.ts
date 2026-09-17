import { pool } from '../shared/db';
import type { DocumentRow } from '../shared/types';

export interface DocumentReindexRow {
  id: string;
  file_name: string;
  pdf_data: Buffer;
}

export async function listDocuments(): Promise<DocumentRow[]> {
  const result = await pool.query<DocumentRow>(
    `SELECT id, type, file_name, created_at, updated_at
     FROM documents
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function insertDocument(fileName: string, pdfData: Buffer): Promise<DocumentRow> {
  const result = await pool.query<DocumentRow>(
    `INSERT INTO documents (type, file_name, pdf_data, created_at, updated_at)
     VALUES ('document', $1, $2, NOW(), NOW())
     RETURNING id, type, file_name, created_at, updated_at`,
    [fileName, pdfData]
  );
  return result.rows[0];
}

export async function deleteDocument(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getDocumentsForReindex(): Promise<DocumentReindexRow[]> {
  const result = await pool.query<DocumentReindexRow>(
    `SELECT id, file_name, pdf_data
     FROM documents
     WHERE type = 'document'
     ORDER BY created_at ASC`
  );
  return result.rows;
}
