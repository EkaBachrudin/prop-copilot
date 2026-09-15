import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { Block, CreateBlockDto, UpdateBlockDto } from '../types';

const validateBlockName = (dto: CreateBlockDto | UpdateBlockDto) => {
  if (!dto.name || dto.name.trim().length === 0) {
    throw new AppError('Block name is required', 400, 'VALIDATION_ERROR', {
      name: ['Block name is required'],
    });
  }
  if (dto.name.length > 100) {
    throw new AppError('Block name must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
      name: ['Maximum 100 characters'],
    });
  }
};

export const createBlock = async (propertyId: string, dto: CreateBlockDto): Promise<Block> => {
  validateBlockName(dto);

  const property = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (property.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const duplicate = await pool.query(
    'SELECT id FROM blocks WHERE property_id = $1 AND name = $2',
    [propertyId, dto.name!.trim()]
  );
  if (duplicate.rows.length > 0) {
    throw new AppError('Block name already exists in this property', 409, 'CONFLICT', {
      name: ['Block name already exists in this property'],
    });
  }

  const result = await pool.query(
    `INSERT INTO blocks (property_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW())
     RETURNING *`,
    [propertyId, dto.name!.trim()]
  );

  return result.rows[0] as Block;
};

export const updateBlock = async (blockId: string, dto: UpdateBlockDto): Promise<Block> => {
  validateBlockName(dto);

  const existing = await pool.query('SELECT id, property_id FROM blocks WHERE id = $1', [blockId]);
  if (existing.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const propertyId = existing.rows[0].property_id as string;

  const duplicate = await pool.query(
    'SELECT id FROM blocks WHERE property_id = $1 AND name = $2 AND id != $3',
    [propertyId, dto.name!.trim(), blockId]
  );
  if (duplicate.rows.length > 0) {
    throw new AppError('Block name already exists in this property', 409, 'CONFLICT', {
      name: ['Block name already exists in this property'],
    });
  }

  const result = await pool.query(
    `UPDATE blocks SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [dto.name!.trim(), blockId]
  );

  return result.rows[0] as Block;
};

export const deleteBlock = async (blockId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM blocks WHERE id = $1', [blockId]);
  if (existing.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM blocks WHERE id = $1', [blockId]);
};
