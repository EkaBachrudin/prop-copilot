import { describe, expect, it } from 'vitest';
import {
  buildPropertyCatalogBlock,
  buildUnitDetailBlock,
  groupListings,
  wantsUnitDetail,
} from './listings';
import type { ListingRow } from '../shared/types';

const row = (overrides: Partial<ListingRow>): ListingRow => ({
  unit_id: 'u1',
  unit_name: 'A1',
  block_id: 'b1',
  block_name: 'Blok A',
  property_id: 'p1',
  property_name: 'Brassia Garden',
  area: 'Bekasi',
  address: 'Jl. Brassia Raya No. 1, Bekasi',
  property_type: 'Rumah',
  land_area: 84,
  price: 1_008_000_000,
  status: 'available',
  description: 'Cluster modern dengan akses tol',
  ...overrides,
});

const sample = (): ListingRow[] => [
  row({ unit_id: 'u1', unit_name: 'A1', price: 1_000_000_000, land_area: 84 }),
  row({ unit_id: 'u2', unit_name: 'A2', price: 1_100_000_000, land_area: 90 }),
  row({
    unit_id: 'u3',
    unit_name: 'B1',
    block_id: 'b2',
    block_name: 'Blok B',
    price: 2_000_000_000,
    land_area: 120,
  }),
  row({
    unit_id: 'u4',
    unit_name: 'G1',
    block_id: 'b3',
    block_name: 'Block Anggrek',
    property_id: 'p2',
    property_name: 'Grand Permata Residence',
    area: 'Jakarta Selatan',
    address: 'Jl. Permata Raya No. 1, Jakarta Selatan',
    property_type: 'Ruko',
    price: 1_080_000_000,
    land_area: 72,
    description: 'Cluster premium di Jakarta Selatan',
  }),
];

describe('groupListings', () => {
  it('groups units into properties and blocks with aggregates', () => {
    const properties = groupListings(sample());

    expect(properties).toHaveLength(2);
    const brassia = properties.find((property) => property.name === 'Brassia Garden');
    expect(brassia).toBeDefined();
    expect(brassia?.city).toBe('Bekasi');
    expect(brassia?.available_count).toBe(3);
    expect(brassia?.price_min).toBe(1_000_000_000);
    expect(brassia?.price_max).toBe(2_000_000_000);
    expect(brassia?.blocks.map((block) => block.block_name)).toEqual(['Blok A', 'Blok B']);
    expect(brassia?.blocks[0].available_count).toBe(2);
  });

  it('collects property types across blocks', () => {
    const grand = groupListings(sample()).find(
      (property) => property.name === 'Grand Permata Residence'
    );

    expect(grand?.types).toEqual(['Ruko']);
    expect(grand?.blocks[0].types).toEqual(['Ruko']);
  });
});

describe('block builders', () => {
  it('renders a property-level catalog block', () => {
    const block = buildPropertyCatalogBlock(groupListings(sample()));

    expect(block).toContain('[PROPERTY CATALOG]');
    expect(block).toContain('Property: Brassia Garden');
    expect(block).toContain('City: Bekasi');
    expect(block).toContain('- Blok A: 2 unit tersedia');
    expect(block).toContain('[/PROPERTY CATALOG]');
  });

  it('renders unit detail and respects the limit', () => {
    const block = buildUnitDetailBlock(groupListings(sample()), 2);
    const unitLines = block.split('\n').filter((line) => /^\d+\.\s/.test(line));

    expect(block).toContain('[UNIT DETAIL]');
    expect(unitLines).toHaveLength(2);
  });

  it('returns empty strings for empty input', () => {
    expect(buildPropertyCatalogBlock([])).toBe('');
    expect(buildUnitDetailBlock([], 10)).toBe('');
  });
});

describe('wantsUnitDetail', () => {
  const catalog = groupListings(sample());

  it('detects detail keywords', () => {
    expect(wantsUnitDetail('boleh lihat detail unitnya?', catalog)).toBe(true);
  });

  it('detects a referenced property name', () => {
    expect(wantsUnitDetail('yang Brassia Garden saja', catalog)).toBe(true);
  });

  it('is false for an unrelated message', () => {
    expect(wantsUnitDetail('berapa harganya?', catalog)).toBe(false);
  });
});
