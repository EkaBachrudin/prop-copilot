import { Request, Response } from 'express';
import { createBlock, deleteBlock, updateBlock } from '../services/blocksService';
import { CreateBlockDto, UpdateBlockDto } from '../types';

export const createBlockController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreateBlockDto = req.body;
  const block = await createBlock(req.params.propertyId as string, dto);
  res.status(201).json({ success: true, message: 'Block created successfully', data: { block } });
};

export const updateBlockController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateBlockDto = req.body;
  const block = await updateBlock(req.params.id as string, dto);
  res.status(200).json({ success: true, message: 'Block updated successfully', data: { block } });
};

export const deleteBlockController = async (req: Request, res: Response): Promise<void> => {
  await deleteBlock(req.params.id as string);
  res.status(200).json({ success: true, message: 'Block deleted successfully' });
};
