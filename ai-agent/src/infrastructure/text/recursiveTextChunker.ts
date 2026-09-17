import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { TextChunker } from '../../application/ports/TextChunker';

export interface RecursiveTextChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export class RecursiveTextChunker implements TextChunker {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor(options: RecursiveTextChunkerOptions) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });
  }

  split(text: string): Promise<string[]> {
    return this.splitter.splitText(text);
  }
}
