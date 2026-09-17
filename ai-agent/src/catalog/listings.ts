import { pool } from '../shared/db';
import { formatPrice } from '../rag/rag';
import type {
  CatalogBlock,
  CatalogProperty,
  CatalogUnit,
  ListingFilters,
  ListingRow,
} from '../shared/types';

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

const toNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const aggregate = (values: number[]): { min: number | null; max: number | null } => {
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
};

const formatSize = (size: number | null): string => (size === null ? 'N/A' : `${size} m²`);

const formatSizeRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max !== null && min !== max) return `${min}-${max} m²`;
  return formatSize(max ?? min);
};

const formatPriceRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max !== null && min !== max) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  return formatPrice(max ?? min);
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

/** Available units joined with block/property, filtered by area/type/budget. */
export async function fetchListingCatalog(
  filters: ListingFilters = {}
): Promise<CatalogProperty[]> {
  const conditions = [
    'p.is_active = true',
    "u.status = 'available'",
    'u.property_type IS NOT NULL',
    'u.price IS NOT NULL',
  ];
  const params: unknown[] = [];

  if (filters.cities && filters.cities.length > 0) {
    params.push(filters.cities);
    conditions.push(`p.city = ANY($${params.length}::text[])`);
  }
  if (filters.propertyIds && filters.propertyIds.length > 0) {
    params.push(filters.propertyIds);
    conditions.push(`p.id = ANY($${params.length}::uuid[])`);
  }
  if (filters.propertyType) {
    params.push(filters.propertyType);
    conditions.push(`u.property_type = $${params.length}`);
  }
  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    params.push(filters.maxPrice);
    conditions.push(`u.price <= $${params.length}`);
  }

  const result = await pool.query<ListingRow>(
    `SELECT u.id AS unit_id,
            u.name AS unit_name,
            b.id AS block_id,
            b.name AS block_name,
            p.id AS property_id,
            p.name AS property_name,
            p.city AS area,
            p.address,
            u.property_type,
            u.land_area,
            u.price,
            u.status,
            p.description
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     JOIN properties p ON p.id = b.property_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.city, p.name, b.name, u.name`,
    params
  );

  return groupListings(result.rows);
}

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

/** True when the customer explicitly asks for unit-level detail. */
export function wantsUnitDetail(message: string, properties: CatalogProperty[]): boolean {
  const normalized = message.toLowerCase();

  if (DETAIL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;

  return properties.some((property) => {
    if (normalized.includes(property.name.toLowerCase())) return true;
    return property.blocks.some((block) => normalized.includes(block.block_name.toLowerCase()));
  });
}
