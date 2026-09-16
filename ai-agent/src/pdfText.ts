import { PDFParse } from 'pdf-parse';

/** Extract plain text from a PDF buffer (pdf-parse v2 API). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text || '').trim();
  } finally {
    await parser.destroy();
  }
}
