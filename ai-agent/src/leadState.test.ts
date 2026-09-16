import { describe, expect, it } from 'vitest';
import {
  buildKnownDataBlock,
  computeScore,
  computeStatus,
  containsListingLines,
  emptyKnownLead,
  mergeLeadData,
  missingFields,
  stripListingLines,
} from './leadState';

describe('mergeLeadData', () => {
  it('keeps previous fields when a later turn omits them', () => {
    const first = mergeLeadData(emptyKnownLead(), { area: 'Bekasi' });
    const second = mergeLeadData(first, { budget: '2 Miliar' });

    expect(second.area).toBe('Bekasi');
    expect(second.budget).toBe('2 Miliar');
  });

  it('off-topic turn keeps area known', () => {
    let known = mergeLeadData(emptyKnownLead(), { area: 'Bekasi' });
    known = mergeLeadData(known, {});

    expect(known.area).toBe('Bekasi');
  });

  it('ignores empty/blank values', () => {
    const known = mergeLeadData(
      { ...emptyKnownLead(), budget: '1 Miliar' },
      {
        budget: '   ',
        area: 'Bandung',
      }
    );

    expect(known.budget).toBe('1 Miliar');
    expect(known.area).toBe('Bandung');
  });
});

describe('scoring', () => {
  it('adds 20 per scored field', () => {
    const known = mergeLeadData(emptyKnownLead(), {
      budget: '2 Miliar',
      area: 'Bekasi',
      property_type: 'Ruko',
    });

    expect(computeScore(known)).toBe(60);
    expect(computeStatus(60)).toBe('hot');
  });

  it('maps warm and cold thresholds', () => {
    expect(computeStatus(40)).toBe('warm');
    expect(computeStatus(20)).toBe('cold');
  });
});

describe('listing line gate', () => {
  const replyWithListings =
    'Baik, ini pilihan untuk Anda:\n\n1. Ruko Bekasi — Rp 1 M\n2. Rumah Bekasi — Rp 2 M\n\nBerapa anggaran Anda?';

  it('detects numbered listing lines', () => {
    expect(containsListingLines(replyWithListings)).toBe(true);
    expect(containsListingLines('Halo, ada yang bisa dibantu?')).toBe(false);
  });

  it('keeps the question while removing listings', () => {
    const stripped = stripListingLines(replyWithListings, 'fallback');

    expect(stripped).not.toContain('1. Ruko Bekasi');
    expect(stripped).toContain('Berapa anggaran Anda?');
  });

  it('returns the fallback when everything is stripped', () => {
    const onlyListings = '1. Ruko — Rp 1 M\n2. Rumah — Rp 2 M';
    expect(stripListingLines(onlyListings, 'fallback')).toBe('fallback');
  });
});

describe('missingFields / known block', () => {
  it('lists only the missing scored fields and renders known data', () => {
    const known = mergeLeadData(emptyKnownLead(), { area: 'Bekasi' });

    expect(missingFields(known)).toEqual(['budget', 'property_type', 'size', 'purpose']);
    expect(buildKnownDataBlock(known)).toContain('area=Bekasi');
    expect(buildKnownDataBlock(known)).toContain('NEVER ask for them again');
  });
});
