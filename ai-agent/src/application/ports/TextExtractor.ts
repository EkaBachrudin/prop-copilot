export interface TextExtractor {
  extract(data: Uint8Array): Promise<string>;
}
