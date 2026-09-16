import { describe, expect, it } from 'vitest';
import { parseBudgetToIdr } from './budget';

describe('parseBudgetToIdr', () => {
  it('parses miliar shorthand', () => {
    expect(parseBudgetToIdr('2 Miliar')).toBe(2_000_000_000);
    expect(parseBudgetToIdr('Rp 3 M')).toBe(3_000_000_000);
    expect(parseBudgetToIdr('1.5m')).toBe(1_500_000_000);
    expect(parseBudgetToIdr('2,5 M')).toBe(2_500_000_000);
  });

  it('parses juta / ribu shorthand', () => {
    expect(parseBudgetToIdr('500 juta')).toBe(500_000_000);
    expect(parseBudgetToIdr('750 jt')).toBe(750_000_000);
    expect(parseBudgetToIdr('300 ribu')).toBe(300_000);
  });

  it('parses plain and dotted amounts', () => {
    expect(parseBudgetToIdr('800000000')).toBe(800_000_000);
    expect(parseBudgetToIdr('1.008.000.000')).toBe(1_008_000_000);
    expect(parseBudgetToIdr('2.500')).toBe(2_500);
  });

  it('extracts the amount from a sentence', () => {
    expect(parseBudgetToIdr('budget saya dibawah 2 miliar')).toBe(2_000_000_000);
  });

  it('returns null for unusable input', () => {
    expect(parseBudgetToIdr('')).toBeNull();
    expect(parseBudgetToIdr('murah saja')).toBeNull();
    expect(parseBudgetToIdr(null)).toBeNull();
    expect(parseBudgetToIdr(undefined)).toBeNull();
  });
});
