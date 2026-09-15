import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import {
  CreatePropertyDto,
  GetPropertiesQuery,
  Property,
  PropertyDetail,
  PropertyListItem,
  UpdatePropertyDto,
} from '../types';

export const getProperties = async (
  query: GetPropertiesQuery
): Promise<{
  properties: PropertyListItem[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
}> => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, query.limit || 10);
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const city = query.city?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`p.name ILIKE $${i++}`);
    params.push(`%${search}%`);
  }
  if (city) {
    conditions.push(`p.city ILIKE $${i++}`);
    params.push(`%${city}%`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM properties p ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const dataQuery = `
    SELECT
      p.id, p.name, p.city, p.land_area, p.address, p.description,
      p.is_active, p.created_at, p.updated_at,
      COALESCE(bc.block_count, 0) AS total_blocks,
      COALESCE(uc.unit_count, 0)  AS total_units
    FROM properties p
    LEFT JOIN (
      SELECT property_id, COUNT(id) AS block_count
      FROM blocks
      WHERE is_active = true
      GROUP BY property_id
    ) bc ON bc.property_id = p.id
    LEFT JOIN (
      SELECT b.property_id, COUNT(u.id) AS unit_count
      FROM blocks b
      JOIN units u ON u.block_id = b.id
      GROUP BY b.property_id
    ) uc ON uc.property_id = p.id
    ${whereClause}
    ORDER BY p.name ASC
    LIMIT $${i++} OFFSET $${i++}
  `;
  params.push(limit, offset);

  const result = await pool.query(dataQuery, params);

  return {
    properties: result.rows as PropertyListItem[],
    pagination: { page, limit, total_items: totalItems, total_pages: totalPages },
  };
};

export const getPropertyDetail = async (propertyId: string): Promise<PropertyDetail> => {
  const propertyResult = await pool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
  if (propertyResult.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const blocksResult = await pool.query(
    `SELECT
       b.id, b.name, b.is_active, b.created_at, b.updated_at,
       COALESCE(uc.unit_count, 0) AS total_units
     FROM blocks b
     LEFT JOIN (
       SELECT block_id, COUNT(id) AS unit_count
       FROM units
       GROUP BY block_id
     ) uc ON uc.block_id = b.id
     WHERE b.property_id = $1
     ORDER BY b.name ASC`,
    [propertyId]
  );

  return {
    property: propertyResult.rows[0] as Property,
    blocks: blocksResult.rows,
  };
};

const validatePropertyFields = (dto: CreatePropertyDto | UpdatePropertyDto, isCreate: boolean) => {
  if (isCreate || dto.name !== undefined) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new AppError('Property name is required', 400, 'VALIDATION_ERROR', {
        name: ['Property name is required'],
      });
    }
    if (dto.name.length > 255) {
      throw new AppError('Property name must be maximum 255 characters', 400, 'VALIDATION_ERROR', {
        name: ['Maximum 255 characters'],
      });
    }
  }

  if (isCreate || dto.city !== undefined) {
    if (!dto.city || dto.city.trim().length === 0) {
      throw new AppError('City is required', 400, 'VALIDATION_ERROR', {
        city: ['City is required'],
      });
    }
    if (dto.city.length > 100) {
      throw new AppError('City must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
        city: ['Maximum 100 characters'],
      });
    }
  }

  if (dto.land_area !== undefined) {
    if (typeof dto.land_area !== 'number' || Number.isNaN(dto.land_area) || dto.land_area < 0) {
      throw new AppError('Land area must be a non-negative number', 400, 'VALIDATION_ERROR', {
        land_area: ['Must be a non-negative number'],
      });
    }
  }
};

export const createProperty = async (dto: CreatePropertyDto): Promise<Property> => {
  validatePropertyFields(dto, true);

  const result = await pool.query(
    `INSERT INTO properties (name, city, land_area, address, description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     RETURNING *`,
    [
      dto.name!.trim(),
      dto.city!.trim(),
      dto.land_area ?? null,
      dto.address?.trim() || null,
      dto.description?.trim() || null,
    ]
  );

  return result.rows[0] as Property;
};

export const updateProperty = async (
  propertyId: string,
  dto: UpdatePropertyDto
): Promise<Property> => {
  const existing = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (existing.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  validatePropertyFields(dto, false);

  const hasField =
    dto.name !== undefined ||
    dto.city !== undefined ||
    dto.land_area !== undefined ||
    dto.address !== undefined ||
    dto.description !== undefined;

  if (!hasField) {
    throw new AppError('At least one field must be provided', 400, 'VALIDATION_ERROR');
  }

  const result = await pool.query(
    `UPDATE properties
     SET name = COALESCE($2, name),
         city = COALESCE($3, city),
         land_area = COALESCE($4, land_area),
         address = COALESCE($5, address),
         description = COALESCE($6, description),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      propertyId,
      dto.name?.trim(),
      dto.city?.trim(),
      dto.land_area ?? null,
      dto.address?.trim() ?? null,
      dto.description?.trim() ?? null,
    ]
  );

  return result.rows[0] as Property;
};

export const deleteProperty = async (propertyId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (existing.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM properties WHERE id = $1', [propertyId]);
};
