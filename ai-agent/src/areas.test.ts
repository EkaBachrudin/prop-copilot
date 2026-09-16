import { describe, expect, it } from 'vitest';
import { detectMatchingAreas, detectMatchingProperties } from './areas';
import type { KnownProperty } from './types';

const properties: KnownProperty[] = [
  { id: 'p1', name: 'Brassia Garden', city: 'Bekasi' },
  { id: 'p2', name: 'Grand Permata Residence', city: 'Jakarta Selatan' },
];

describe('detectMatchingAreas', () => {
  const areas = ['Lippo Karawaci', 'Bekasi', 'Jakarta Selatan'];

  it('matches an area mentioned with a typo', () => {
    expect(detectMatchingAreas('ada ruko di lipo karawaci?', areas)).toEqual(['Lippo Karawaci']);
  });

  it('matches an exact area name', () => {
    expect(detectMatchingAreas('rumah di bekasi', areas)).toEqual(['Bekasi']);
  });

  it('ignores unrelated messages', () => {
    expect(detectMatchingAreas('berapa harganya?', areas)).toEqual([]);
  });
});

describe('detectMatchingProperties', () => {
  it('resolves a typo in a project name', () => {
    expect(
      detectMatchingProperties(
        'Halo apakah ini dengan agen property brasia garden, saya tertarik membeli rumah di sana.',
        properties
      )
    ).toEqual([properties[0]]);
  });

  it('matches multiple typos across words', () => {
    expect(detectMatchingProperties('saya tertarik brasia gardn', properties)).toEqual([
      properties[0],
    ]);
  });

  it('matches an exact project name', () => {
    expect(detectMatchingProperties('Grand Permata Residence masih ada?', properties)).toEqual([
      properties[1],
    ]);
  });

  it('matches a partial project name', () => {
    expect(detectMatchingProperties('ada grand permata?', properties)).toEqual([properties[1]]);
  });

  it('ignores messages that only share a generic word', () => {
    expect(detectMatchingProperties('saya cari grand rumah', properties)).toEqual([]);
  });

  it('ignores messages without any project reference', () => {
    expect(detectMatchingProperties('saya cari rumah di bekasi', properties)).toEqual([]);
  });
});
