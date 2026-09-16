import { Request, Response } from 'express';
import multer from 'multer';
import {
  deleteRagDocument,
  getRagStats,
  listRagDocuments,
  reindexRag,
  searchRag,
  uploadRagDocument,
} from '../services/ragAdminService';
import { AppError } from '../utils/AppError';

export const ragUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const uploadRagDocumentController = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('file is required', 400, 'VALIDATION_ERROR', { file: ['file is required'] });
  }

  const data = await uploadRagDocument({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  });
  res.status(201).json({ success: true, data });
};

export const listRagDocumentsController = async (_req: Request, res: Response): Promise<void> => {
  const data = await listRagDocuments();
  res.status(200).json({ success: true, data });
};

export const getRagStatsController = async (_req: Request, res: Response): Promise<void> => {
  const data = await getRagStats();
  res.status(200).json({ success: true, data });
};

export const deleteRagDocumentController = async (req: Request, res: Response): Promise<void> => {
  const data = await deleteRagDocument(req.params.id as string);
  res.status(200).json({ success: true, data });
};

export const searchRagController = async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.body.query === 'string' ? req.body.query.trim() : '';
  if (!query) {
    throw new AppError('query is required', 400, 'VALIDATION_ERROR', {
      query: ['query is required'],
    });
  }

  const k = typeof req.body.k === 'number' ? req.body.k : undefined;
  const data = await searchRag(query, k);
  res.status(200).json({ success: true, data });
};

export const reindexRagController = async (_req: Request, res: Response): Promise<void> => {
  const data = await reindexRag();
  res.status(200).json({ success: true, data });
};
