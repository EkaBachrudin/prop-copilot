import { formatPrice, formatPriceRange, formatSize, formatSizeRange } from './format';
import type { CatalogProperty } from './types';

/** Property-level block: name, city, address, description, unit count, price range. */
export function buildPropertyCatalogBlock(properties: CatalogProperty[]): string {
  if (properties.length === 0) return '';

  const lines = properties.map((property) => {
    const summary = `Property: ${property.name} | City: ${property.city} | Address: ${
      property.address ?? '-'
    } | Description: ${property.description ?? '-'} | Available Units: ${
      property.available_count
    } | Price Range: ${formatPriceRange(property.price_min, property.price_max)}`;

    const blockLines = property.blocks.map(
      (block) =>
        `  - ${block.block_name}: ${block.available_count} unit tersedia | ${
          block.types.join('/') || '-'
        } | ${formatSizeRange(block.size_min, block.size_max)} | ${formatPriceRange(
          block.price_min,
          block.price_max
        )}`
    );

    return [summary, ...blockLines].join('\n');
  });

  return `[PROPERTY CATALOG]\n${lines.join('\n\n')}\n[/PROPERTY CATALOG]`;
}

/** Unit-level block: per property/block, a numbered list of individual units. */
export function buildUnitDetailBlock(properties: CatalogProperty[], limit: number): string {
  if (properties.length === 0 || limit <= 0) return '';

  const sections: string[] = [];
  let remaining = limit;

  for (const property of properties) {
    if (remaining <= 0) break;
    const blockSections: string[] = [];

    for (const block of property.blocks) {
      if (remaining <= 0) break;
      const units = block.units.slice(0, remaining);
      remaining -= units.length;
      const lines = units.map(
        (unit, index) =>
          `${index + 1}. ${unit.unit_name} | ${unit.property_type ?? '-'} | ${formatSize(
            unit.land_area
          )} | ${formatPrice(unit.price)} | ${unit.status}`
      );
      blockSections.push(`${block.block_name}:\n${lines.join('\n')}`);
    }

    sections.push(`${property.name} (${property.city})\n${blockSections.join('\n')}`);
  }

  return `[UNIT DETAIL]\n${sections.join('\n\n')}\n[/UNIT DETAIL]`;
}
