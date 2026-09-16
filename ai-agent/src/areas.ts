import { pool } from './db';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedAreas: string[] = [];
let cachedAt = 0;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }

  return previous[b.length];
}

/** Areas are the distinct cities of active properties. */
export async function getKnownAreas(): Promise<string[]> {
  const now = Date.now();
  if (now - cachedAt < CACHE_TTL_MS && cachedAreas.length > 0) {
    return cachedAreas;
  }

  const result = await pool.query<{ city: string }>(
    `SELECT DISTINCT city
     FROM properties
     WHERE is_active = true AND city IS NOT NULL AND city <> ''
     ORDER BY city`
  );

  cachedAreas = result.rows.map((row) => row.city);
  cachedAt = now;
  return cachedAreas;
}

export function invalidateAreaCache(): void {
  cachedAt = 0;
  cachedAreas = [];
}

/**
 * Detect which known areas a message refers to, tolerating typos
 * (e.g. "lipo karawaci" matches "Lippo Karawaci").
 */
export function detectMatchingAreas(message: string, knownAreas: string[]): string[] {
  const normalized = message.toLowerCase();
  const queryTokens = tokenize(message);

  return knownAreas.filter((area) => {
    const lowerArea = area.toLowerCase().trim();
    if (lowerArea.length === 0) return false;

    if (normalized.includes(lowerArea)) return true;

    const areaTokens = tokenize(area).filter((token) => token.length >= 4);
    if (areaTokens.length === 0) return false;

    return areaTokens.every((areaToken) =>
      queryTokens.some((queryToken) => levenshtein(areaToken, queryToken) <= 1)
    );
  });
}
