import type { DocumentStore, ReindexDocument } from '../../application/ports/DocumentStore';
import type { DocumentRow } from '../../domain/types';
import { pool } from '../db';

export class PgDocumentStore implements DocumentStore {
  async list(): Promise<DocumentRow[]> {
    const result = await pool.query<DocumentRow>(
      `SELECT id, type, file_name, created_at, updated_at
       FROM documents
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async insert(fileName: string, pdfData: Uint8Array): Promise<DocumentRow> {
    const result = await pool.query<DocumentRow>(
      `INSERT INTO documents (type, file_name, pdf_data, created_at, updated_at)
       VALUES ('document', $1, $2, NOW(), NOW())
       RETURNING id, type, file_name, created_at, updated_at`,
      [fileName, Buffer.from(pdfData)]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getForReindex(): Promise<ReindexDocument[]> {
    const result = await pool.query<{ id: string; file_name: string; pdf_data: Buffer }>(
      `SELECT id, file_name, pdf_data
       FROM documents
       WHERE type = 'document'
       ORDER BY created_at ASC`
    );
    return result.rows;
  }
}
