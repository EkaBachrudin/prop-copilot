import { DOC_TYPE_INVENTORY, type StoredDocument } from '../types';
import { sanitizeMetadata } from '../knowledge/sanitizeMetadata';
import { formatPrice } from './format';
import type { ListingRow } from './types';

/** Turn an available unit row into an embeddable vector-store document. */
export function listingToDocument(row: ListingRow): StoredDocument {
  const size = row.land_area !== null ? `${row.land_area} m²` : 'N/A';
  const content = [
    `Property: ${row.property_type}`,
    `City: ${row.area}`,
    `Size: ${size}`,
    `Price: ${formatPrice(row.price)}`,
    `Project: ${row.property_name} (${row.block_name} - Unit ${row.unit_name})`,
    `Description: ${row.description ?? '-'}`,
  ].join(' | ');

  return {
    content,
    metadata: sanitizeMetadata({
      doc_type: DOC_TYPE_INVENTORY,
      ref_id: row.unit_id,
      area: row.area,
      property_type: row.property_type ?? '',
      size: row.land_area === null ? '' : String(row.land_area),
      price: row.price === null ? 0 : Number(row.price),
      property_name: row.property_name,
      block_name: row.block_name,
      unit_name: row.unit_name,
      status: row.status,
    }),
  };
}
