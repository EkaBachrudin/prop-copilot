import { describe, expect, it } from 'vitest';
import {
  buildKnownDataBlock,
  emptyKnownLead,
  mergeLeadData,
  missingFields,
  normalizeArea,
} from './leadData';
import { containsListingLines, stripListingLines } from './listingGate';
import { computeScore, computeStatus } from './scoring';

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

describe('normalizeArea', () => {
  const cities = ['Bekasi', 'Jakarta Selatan'];

  it('sets area to the single matched city', () => {
    const known = normalizeArea(emptyKnownLead(), ['Bekasi'], cities);
    expect(known.area).toBe('Bekasi');
  });

  it('replaces a non-city area with the matched city', () => {
    const known = normalizeArea(
      { ...emptyKnownLead(), area: 'Bintaro' },
      ['Jakarta Selatan'],
      cities
    );
    expect(known.area).toBe('Jakarta Selatan');
  });

  it('keeps a valid city and ignores ambiguous matches', () => {
    const keept = normalizeArea({ ...emptyKnownLead(), area: 'Bekasi' }, ['Bekasi'], cities);
    expect(keept.area).toBe('Bekasi');

    const ambiguous = normalizeArea(emptyKnownLead(), ['Bekasi', 'Jakarta Selatan'], cities);
    expect(ambiguous.area).toBeNull();
  });
});

describe('property-level listing gate', () => {
  const replyWithCatalog =
    'Berikut properti yang cocok di Bekasi:\n\n• Brassia Garden — Bekasi · Cluster modern · 31 unit tersedia\n  - Blok A: 8 unit tersedia · Rumah · 84 m² · Rp 1.008.000.000\n\nBerapa anggaran Anda?';

  it('detects bulleted property listings', () => {
    expect(containsListingLines(replyWithCatalog)).toBe(true);
  });

  it('strips property and block lines but keeps the question', () => {
    const stripped = stripListingLines(replyWithCatalog, 'fallback');

    expect(stripped).not.toContain('Brassia Garden');
    expect(stripped).not.toContain('Cluster modern');
    expect(stripped).toContain('Berapa anggaran Anda?');
  });
});
