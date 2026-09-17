export interface TextChunker {
  split(text: string): Promise<string[]>;
}
