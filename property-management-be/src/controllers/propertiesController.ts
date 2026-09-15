import { Request, Response } from 'express';
import {
  createProperty,
  deleteProperty,
  getProperties,
  getPropertyDetail,
  updateProperty,
} from '../services/propertiesService';
import { CreatePropertyDto, GetPropertiesQuery, UpdatePropertyDto } from '../types';

const parseLandArea = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getPropertiesController = async (req: Request, res: Response): Promise<void> => {
  const query: GetPropertiesQuery = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    search: req.query.search as string | undefined,
    city: req.query.city as string | undefined,
  };

  const result = await getProperties(query);
  res.status(200).json({ success: true, data: result });
};

export const getPropertyDetailController = async (req: Request, res: Response): Promise<void> => {
  const result = await getPropertyDetail(req.params.id as string);
  res.status(200).json({ success: true, data: result });
};

export const createPropertyController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreatePropertyDto = {
    name: req.body.name,
    city: req.body.city,
    land_area: parseLandArea(req.body.land_area),
    address: req.body.address,
    description: req.body.description,
  };

  const property = await createProperty(dto);
  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: { property },
  });
};

export const updatePropertyController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdatePropertyDto = {
    name: req.body.name,
    city: req.body.city,
    land_area: parseLandArea(req.body.land_area),
    address: req.body.address,
    description: req.body.description,
  };

  const property = await updateProperty(req.params.id as string, dto);
  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    data: { property },
  });
};

export const deletePropertyController = async (req: Request, res: Response): Promise<void> => {
  await deleteProperty(req.params.id as string);
  res.status(200).json({ success: true, message: 'Property deleted successfully' });
};
