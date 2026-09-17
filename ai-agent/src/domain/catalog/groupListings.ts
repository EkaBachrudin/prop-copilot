import type { CatalogBlock, CatalogProperty, CatalogUnit, ListingRow } from './types';

const toNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const aggregate = (values: number[]): { min: number | null; max: number | null } => {
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
};

function buildBlocks(rows: ListingRow[]): CatalogBlock[] {
  const blocks = new Map<string, { block_id: string; block_name: string; units: CatalogUnit[] }>();

  for (const row of rows) {
    const unit: CatalogUnit = {
      unit_id: row.unit_id,
      unit_name: row.unit_name,
      property_type: row.property_type,
      land_area: toNumber(row.land_area),
      price: toNumber(row.price),
      status: row.status,
    };
    const existing = blocks.get(row.block_id);
    if (existing) {
      existing.units.push(unit);
    } else {
      blocks.set(row.block_id, {
        block_id: row.block_id,
        block_name: row.block_name,
        units: [unit],
      });
    }
  }

  return [...blocks.values()].map((block) => {
    const prices = block.units
      .map((unit) => unit.price)
      .filter((price): price is number => price !== null);
    const sizes = block.units
      .map((unit) => unit.land_area)
      .filter((size): size is number => size !== null);
    const types = [
      ...new Set(
        block.units
          .map((unit) => unit.property_type)
          .filter((type): type is string => typeof type === 'string' && type.length > 0)
      ),
    ].sort();
    const price = aggregate(prices);
    const size = aggregate(sizes);

    return {
      block_id: block.block_id,
      block_name: block.block_name,
      units: block.units,
      available_count: block.units.length,
      price_min: price.min,
      price_max: price.max,
      size_min: size.min,
      size_max: size.max,
      types,
    };
  });
}

/** Group flat listing rows into properties → blocks → units with aggregates. */
export function groupListings(rows: ListingRow[]): CatalogProperty[] {
  const properties = new Map<
    string,
    {
      property_id: string;
      name: string;
      city: string;
      address: string | null;
      description: string | null;
      rows: ListingRow[];
    }
  >();

  for (const row of rows) {
    const existing = properties.get(row.property_id);
    if (existing) {
      existing.rows.push(row);
    } else {
      properties.set(row.property_id, {
        property_id: row.property_id,
        name: row.property_name,
        city: row.area,
        address: row.address,
        description: row.description,
        rows: [row],
      });
    }
  }

  return [...properties.values()].map((property) => {
    const blocks = buildBlocks(property.rows);
    const prices = blocks
      .flatMap((block) => [block.price_min, block.price_max])
      .filter((price): price is number => price !== null);
    const types = [...new Set(blocks.flatMap((block) => block.types))].sort();
    const price = aggregate(prices);

    return {
      property_id: property.property_id,
      name: property.name,
      city: property.city,
      address: property.address,
      description: property.description,
      available_count: blocks.reduce((total, block) => total + block.available_count, 0),
      price_min: price.min,
      price_max: price.max,
      types,
      blocks,
    };
  });
}
