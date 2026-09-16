const UNIT_MULTIPLIERS: Array<{ pattern: RegExp; multiplier: number }> = [
  { pattern: /(miliar|milyar|billion|b|m)\b/, multiplier: 1_000_000_000 },
  { pattern: /(juta|jt|million|j)\b/, multiplier: 1_000_000 },
  { pattern: /(ribu|rb|k)\b/, multiplier: 1_000 },
];

function normalizeNumeric(raw: string): number | null {
  let text = raw.trim();
  if (text.length === 0) return null;

  const hasDot = text.includes('.');
  const hasComma = text.includes(',');

  if (hasDot && hasComma) {
    const decimalSep = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
    const thousandSep = decimalSep === '.' ? ',' : '.';
    text = text.split(thousandSep).join('');
    if (decimalSep === ',') text = text.replace(',', '.');
  } else if (hasComma) {
    text = text.replace(',', '.');
  } else if (hasDot) {
    const dots = text.split('.').length - 1;
    const digitsAfter = text.length - text.lastIndexOf('.') - 1;
    if (dots > 1 || (digitsAfter === 3 && Number(text.replace('.', '')) >= 1)) {
      text = text.split('.').join('');
    }
  }

  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}

/**
 * Parse a free-text budget into an IDR amount.
 * Supports "2 Miliar", "2,5 M", "Rp 3 M", "500 juta", "1.5m", "800000000".
 */
export function parseBudgetToIdr(value: unknown): number | null {
  if (typeof value !== 'string') return null;

  const normalized = value.toLowerCase().replace(/rp\.?/g, ' ').trim();
  if (normalized.length === 0) return null;

  const match = normalized.match(/-?\d[\d.,]*/);
  if (!match) return null;

  const amount = normalizeNumeric(match[0]);
  if (amount === null || amount <= 0) return null;

  const unit = UNIT_MULTIPLIERS.find((entry) => entry.pattern.test(normalized));
  const multiplier = unit?.multiplier ?? 1;

  return Math.round(amount * multiplier);
}
