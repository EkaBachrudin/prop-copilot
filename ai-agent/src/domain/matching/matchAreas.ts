import type { KnownProperty } from '../catalog/types';
import { FUZZY_MAX_DISTANCE, MIN_TOKEN_LENGTH, levenshtein, tokenize } from './text';

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
