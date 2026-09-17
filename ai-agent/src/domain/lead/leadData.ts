import { KNOWN_KEYS, SCORED_FIELDS, type KnownKey, type KnownLead, type LeadData } from '../types';

export const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const emptyKnownLead = (): KnownLead =>
  KNOWN_KEYS.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as KnownLead);

export const emptyLeadData = (): LeadData => ({
  ...emptyKnownLead(),
  extra_info: {},
});

/** Safely coerce arbitrary (LLM) output into the canonical lead_data shape. */
export const normalizeLeadData = (raw: unknown): LeadData => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result = emptyLeadData();

  for (const key of KNOWN_KEYS) {
    result[key] = hasText(source[key]) ? String(source[key]).trim() : null;
  }

  const extra = source.extra_info;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    result.extra_info = extra as Record<string, unknown>;
  }

  return result;
};

export const normalizeKnownLead = (raw: unknown): KnownLead => {
  const lead = normalizeLeadData(raw);
  const known = emptyKnownLead();
  for (const key of KNOWN_KEYS) known[key] = lead[key];
  return known;
};

/** Only non-empty values overwrite; omitted fields are never cleared. */
export const mergeLeadData = (known: KnownLead, incoming: Partial<KnownLead> | null): KnownLead => {
  const merged: KnownLead = { ...emptyKnownLead(), ...known };
  if (!incoming) return merged;

  for (const key of KNOWN_KEYS) {
    const value = incoming[key];
    if (hasText(value)) merged[key] = value.trim();
  }

  return merged;
};

/**
 * Area is the property city. When the message resolves to exactly one known
 * city and the stored area is empty/invalid, normalize it to that city.
 */
export const normalizeArea = (
  known: KnownLead,
  matchedCities: string[],
  knownCities: string[]
): KnownLead => {
  if (matchedCities.length !== 1) return known;

  const current = known.area;
  const isValidCity =
    hasText(current) && knownCities.some((city) => city.toLowerCase() === current.toLowerCase());

  return isValidCity ? known : { ...known, area: matchedCities[0] };
};

/** Fill per-turn lead_data from the accumulated known values. */
export const backfillLeadData = (
  incoming: Partial<KnownLead>,
  known: KnownLead
): Partial<KnownLead> => {
  const filled: Partial<KnownLead> = {};
  for (const key of KNOWN_KEYS) {
    if (!hasText(incoming[key]) && hasText(known[key])) {
      filled[key] = known[key];
    }
  }
  return filled;
};

export const missingFields = (known: KnownLead): KnownKey[] =>
  SCORED_FIELDS.filter((field) => !hasText(known[field]));

export const buildKnownDataBlock = (known: KnownLead): string => {
  const entries = KNOWN_KEYS.filter((key) => key !== 'name' && hasText(known[key])).map(
    (key) => `${key}=${known[key]}`
  );
  const missing = missingFields(known);

  return [
    '[KNOWN CUSTOMER DATA]',
    entries.length > 0 ? entries.join('; ') : 'none',
    'These values are ALREADY known — NEVER ask for them again.',
    `Still missing: ${missing.length > 0 ? missing.join(', ') : 'none'}.`,
    '[/KNOWN CUSTOMER DATA]',
  ].join('\n');
};
