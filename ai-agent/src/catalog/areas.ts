import { pool } from '../shared/db';
import type { KnownProperty } from '../shared/types';

const CACHE_TTL_MS = 5 * 60 * 1000;
const FUZZY_MAX_DISTANCE = 1;
const MIN_TOKEN_LENGTH = 4;

let cachedAreas: string[] = [];
let cachedAt = 0;
let cachedProperties: KnownProperty[] = [];
let cachedPropertiesAt = 0;

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

/** Active project names with their city, used for typo-tolerant project matching. */
export async function getKnownProperties(): Promise<KnownProperty[]> {
  const now = Date.now();
  if (now - cachedPropertiesAt < CACHE_TTL_MS && cachedProperties.length > 0) {
    return cachedProperties;
  }

  const result = await pool.query<KnownProperty>(
    `SELECT id, name, city
     FROM properties
     WHERE is_active = true AND name IS NOT NULL AND name <> ''
     ORDER BY name`
  );

  cachedProperties = result.rows;
  cachedPropertiesAt = now;
  return cachedProperties;
}

export function invalidateAreaCache(): void {
  cachedAt = 0;
  cachedAreas = [];
}

export function invalidatePropertyCache(): void {
  cachedPropertiesAt = 0;
  cachedProperties = [];
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

    const areaTokens = tokenize(area).filter((token) => token.length >= MIN_TOKEN_LENGTH);
    if (areaTokens.length === 0) return false;

    return areaTokens.every((areaToken) =>
      queryTokens.some((queryToken) => levenshtein(areaToken, queryToken) <= FUZZY_MAX_DISTANCE)
    );
  });
}

/**
 * Detect which known properties a message refers to, tolerating typos
 * (e.g. "brasia garden" matches "Brassia Garden").
 *
 * Unlike areas, project names can span several words, so a match only requires
 * a majority of the significant tokens to fuzzy-match instead of all of them.
 */
export function detectMatchingProperties(
  message: string,
  knownProperties: KnownProperty[]
): KnownProperty[] {
  const normalized = message.toLowerCase();
  const queryTokens = tokenize(message);

  return knownProperties.filter((property) => {
    const lowerName = property.name.toLowerCase().trim();
    if (lowerName.length === 0) return false;

    if (normalized.includes(lowerName)) return true;

    const nameTokens = tokenize(property.name).filter((token) => token.length >= MIN_TOKEN_LENGTH);
    if (nameTokens.length === 0) return false;

    const matched = nameTokens.filter((nameToken) =>
      queryTokens.some((queryToken) => levenshtein(nameToken, queryToken) <= FUZZY_MAX_DISTANCE)
    ).length;

    return matched >= Math.min(2, nameTokens.length) && matched / nameTokens.length >= 0.5;
  });
}
