import { PDFParse } from 'pdf-parse';
import type { TextExtractor } from '../../application/ports/TextExtractor';

/** Extract plain text from a PDF buffer (pdf-parse v2 API). */
export class PdfTextExtractor implements TextExtractor {
  async extract(data: Uint8Array): Promise<string> {
    const parser = new PDFParse({ data });
    try {
      const result = await parser.getText();
      return (result.text || '').trim();
    } finally {
      await parser.destroy();
    }
  }
}
