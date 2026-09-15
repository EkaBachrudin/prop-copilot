import { Request, Response } from 'express';
import {
  createUnit,
  deleteUnit,
  getUnitDetail,
  getUnits,
  updateUnit,
} from '../services/unitsService';
import { CreateUnitDto, GetUnitsQuery, UnitStatus, UpdateUnitDto } from '../types';

const parseLandArea = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getUnitsController = async (req: Request, res: Response): Promise<void> => {
  const query: GetUnitsQuery = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    status: req.query.status as UnitStatus | undefined,
    search: req.query.search as string | undefined,
  };

  const result = await getUnits(req.params.blockId as string, query);
  res.status(200).json({ success: true, data: result });
};

export const getUnitDetailController = async (req: Request, res: Response): Promise<void> => {
  const unit = await getUnitDetail(req.params.id as string);
  res.status(200).json({ success: true, data: { unit } });
};

export const createUnitController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreateUnitDto = {
    name: req.body.name,
    land_area: parseLandArea(req.body.land_area),
    status: req.body.status,
  };

  const unit = await createUnit(req.params.blockId as string, dto);
  res.status(201).json({ success: true, message: 'Unit created successfully', data: { unit } });
};

export const updateUnitController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateUnitDto = {
    name: req.body.name,
    land_area: parseLandArea(req.body.land_area),
    status: req.body.status,
  };

  const unit = await updateUnit(req.params.id as string, dto);
  res.status(200).json({ success: true, message: 'Unit updated successfully', data: { unit } });
};

export const deleteUnitController = async (req: Request, res: Response): Promise<void> => {
  await deleteUnit(req.params.id as string);
  res.status(200).json({ success: true, message: 'Unit deleted successfully' });
};
