const LISTING_LINE_REGEX = /^[ \t]*(?:\d+[.)]\s|[•*]\s|-{1,2}\s|Property:)/i;

const LISTING_INTRO_REGEX =
  /(berikut|pilihan|rekomendasi|daftar).{0,40}(properti|listing|unit|blok|proyek|rumah|ruko|apartemen)/i;

export const containsListingLines = (text: string): boolean =>
  text.split('\n').some((line) => LISTING_LINE_REGEX.test(line));

export const stripListingLines = (text: string, fallback: string): string => {
  const kept = text
    .split('\n')
    .filter((line) => !LISTING_LINE_REGEX.test(line) && !LISTING_INTRO_REGEX.test(line));

  const cleaned = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
};
