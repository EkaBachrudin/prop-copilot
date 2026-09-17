import type { CatalogRepository } from '../../application/ports/CatalogRepository';
import { groupListings } from '../../domain/catalog/groupListings';
import type {
  CatalogProperty,
  KnownProperty,
  ListingFilters,
  ListingRow,
} from '../../domain/catalog/types';
import { pool } from '../db';

const CACHE_TTL_MS = 5 * 60 * 1000;

export class PgCatalogRepository implements CatalogRepository {
  private cachedAreas: string[] = [];
  private cachedAreasAt = 0;
  private cachedProperties: KnownProperty[] = [];
  private cachedPropertiesAt = 0;

  /** Areas are the distinct cities of active properties. */
  async getKnownAreas(): Promise<string[]> {
    const now = Date.now();
    if (now - this.cachedAreasAt < CACHE_TTL_MS && this.cachedAreas.length > 0) {
      return this.cachedAreas;
    }

    const result = await pool.query<{ city: string }>(
      `SELECT DISTINCT city
       FROM properties
       WHERE is_active = true AND city IS NOT NULL AND city <> ''
       ORDER BY city`
    );

    this.cachedAreas = result.rows.map((row) => row.city);
    this.cachedAreasAt = now;
    return this.cachedAreas;
  }

  /** Active project names with their city, used for typo-tolerant project matching. */
  async getKnownProperties(): Promise<KnownProperty[]> {
    const now = Date.now();
    if (now - this.cachedPropertiesAt < CACHE_TTL_MS && this.cachedProperties.length > 0) {
      return this.cachedProperties;
    }

    const result = await pool.query<KnownProperty>(
      `SELECT id, name, city
       FROM properties
       WHERE is_active = true AND name IS NOT NULL AND name <> ''
       ORDER BY name`
    );

    this.cachedProperties = result.rows;
    this.cachedPropertiesAt = now;
    return this.cachedProperties;
  }

  /** Available units joined with block/property, filtered by area/type/budget. */
  async fetchCatalog(filters: ListingFilters = {}): Promise<CatalogProperty[]> {
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

  /** Raw available unit rows used to (re)embed the inventory. */
  async fetchAvailableUnits(): Promise<ListingRow[]> {
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
       WHERE p.is_active = true
         AND u.status = 'available'
         AND u.property_type IS NOT NULL
         AND u.price IS NOT NULL
       ORDER BY p.city, p.name, b.name, u.name`
    );
    return result.rows;
  }
}
