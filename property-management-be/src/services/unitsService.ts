import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { naturalCompare } from '../utils/naturalSort';
import {
  CreateUnitDto,
  GetUnitsQuery,
  PaginatedUnitsResponse,
  UNIT_STATUSES,
  Unit,
  UnitListItem,
  UnitStatus,
  UpdateUnitDto,
} from '../types';

const isValidStatus = (value: unknown): value is UnitStatus =>
  typeof value === 'string' && UNIT_STATUSES.includes(value as UnitStatus);

export const getUnits = async (
  blockId: string,
  query: GetUnitsQuery
): Promise<PaginatedUnitsResponse> => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const offset = (page - 1) * limit;
  const status = query.status;
  const search = query.search?.trim();

  const blockResult = await pool.query(
    `SELECT b.id, b.name, b.property_id, p.name AS property_name
     FROM blocks b
     JOIN properties p ON p.id = b.property_id
     WHERE b.id = $1`,
    [blockId]
  );
  if (blockResult.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const conditions: string[] = ['u.block_id = $1'];
  const params: unknown[] = [blockId];
  let i = 2;

  if (status) {
    if (!isValidStatus(status)) {
      throw new AppError('Invalid status filter', 400, 'VALIDATION_ERROR', {
        status: [`Must be one of: ${UNIT_STATUSES.join(', ')}`],
      });
    }
    conditions.push(`u.status = $${i++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`u.name ILIKE $${i++}`);
    params.push(`%${search}%`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const rowsResult = await pool.query(
    `SELECT u.id, u.name, u.land_area, u.status, u.created_at, u.updated_at
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     ${whereClause}`,
    params
  );

  const units = (rowsResult.rows as UnitListItem[])
    .sort((a, b) => naturalCompare(a.name, b.name))
    .slice(offset, offset + limit);

  return {
    block: blockResult.rows[0],
    units,
    pagination: { page, limit, total_items: totalItems, total_pages: totalPages },
  };
};

export const getUnitDetail = async (
  unitId: string
): Promise<Unit & { block_name: string; property_id: string; property_name: string }> => {
  const result = await pool.query(
    `SELECT u.*, b.name AS block_name, p.id AS property_id, p.name AS property_name
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     JOIN properties p ON p.id = b.property_id
     WHERE u.id = $1`,
    [unitId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
};

const validateUnitFields = (dto: CreateUnitDto | UpdateUnitDto, isCreate: boolean) => {
  if (isCreate || dto.name !== undefined) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new AppError('Unit name is required', 400, 'VALIDATION_ERROR', {
        name: ['Unit name is required'],
      });
    }
    if (dto.name.length > 100) {
      throw new AppError('Unit name must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
        name: ['Maximum 100 characters'],
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

  if (dto.status !== undefined && !isValidStatus(dto.status)) {
    throw new AppError('Invalid unit status', 400, 'VALIDATION_ERROR', {
      status: [`Must be one of: ${UNIT_STATUSES.join(', ')}`],
    });
  }
};

export const createUnit = async (blockId: string, dto: CreateUnitDto): Promise<Unit> => {
  validateUnitFields(dto, true);

  const block = await pool.query('SELECT id FROM blocks WHERE id = $1', [blockId]);
  if (block.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const duplicate = await pool.query('SELECT id FROM units WHERE block_id = $1 AND name = $2', [
    blockId,
    dto.name!.trim(),
  ]);
  if (duplicate.rows.length > 0) {
    throw new AppError('Unit name already exists in this block', 409, 'CONFLICT', {
      name: ['Unit name already exists in this block'],
    });
  }

  const result = await pool.query(
    `INSERT INTO units (block_id, name, land_area, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [blockId, dto.name!.trim(), dto.land_area ?? null, dto.status ?? 'available']
  );

  return result.rows[0] as Unit;
};

export const updateUnit = async (unitId: string, dto: UpdateUnitDto): Promise<Unit> => {
  const existing = await pool.query('SELECT id, block_id FROM units WHERE id = $1', [unitId]);
  if (existing.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  const blockId = existing.rows[0].block_id as string;

  validateUnitFields(dto, false);

  const hasField =
    dto.name !== undefined || dto.land_area !== undefined || dto.status !== undefined;
  if (!hasField) {
    throw new AppError('At least one field must be provided', 400, 'VALIDATION_ERROR');
  }

  if (dto.name !== undefined) {
    const duplicate = await pool.query(
      'SELECT id FROM units WHERE block_id = $1 AND name = $2 AND id != $3',
      [blockId, dto.name.trim(), unitId]
    );
    if (duplicate.rows.length > 0) {
      throw new AppError('Unit name already exists in this block', 409, 'CONFLICT', {
        name: ['Unit name already exists in this block'],
      });
    }
  }

  const result = await pool.query(
    `UPDATE units
     SET name = COALESCE($2, name),
         land_area = COALESCE($3, land_area),
         status = COALESCE($4, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [unitId, dto.name?.trim(), dto.land_area ?? null, dto.status ?? null]
  );

  return result.rows[0] as Unit;
};

export const deleteUnit = async (unitId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM units WHERE id = $1', [unitId]);
  if (existing.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM units WHERE id = $1', [unitId]);
};
