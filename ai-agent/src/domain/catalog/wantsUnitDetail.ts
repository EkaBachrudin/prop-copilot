import type { CatalogProperty } from './types';

const DETAIL_KEYWORDS = [
  'detail',
  'unit',
  'tipe',
  'type',
  'spesifikasi',
  'luas',
  'kavling',
  'lihat',
  'tampilkan',
  'daftar',
];

/** True when the customer explicitly asks for unit-level detail. */
export function wantsUnitDetail(message: string, properties: CatalogProperty[]): boolean {
  const normalized = message.toLowerCase();

  if (DETAIL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;

  return properties.some((property) => {
    if (normalized.includes(property.name.toLowerCase())) return true;
    return property.blocks.some((block) => normalized.includes(block.block_name.toLowerCase()));
  });
}
