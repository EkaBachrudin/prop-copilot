import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../../application/errors';
import type { AgentService } from '../../application/processMessage';
import type { DocumentRow, RagStats, RetrievedChunk } from '../../domain/types';

export interface RagHandlers {
  search(query: string, k: number): Promise<RetrievedChunk[]>;
  listDocuments(): Promise<DocumentRow[]>;
  uploadDocument(file: {
    fileName: string;
    data: Uint8Array;
  }): Promise<{ document: DocumentRow; chunks: number }>;
  deleteDocument(id: string): Promise<{ id: string; deleted: boolean }>;
  stats(): Promise<RagStats>;
  reindex(): Promise<{ listings: number; documentChunks: number }>;
}

export interface AppDeps {
  agent: AgentService;
  rag: RagHandlers;
}

const messageSchema = z.object({
  phone: z.string().min(3),
  name: z.string().optional(),
  message: z.string().min(1),
});

const resetSchema = z.object({ phone: z.string().min(3) });

const searchSchema = z.object({
  query: z.string().min(1),
  k: z.number().int().positive().max(50).optional(),
});

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

const validationError = (res: Response, message: string, issues?: unknown): void => {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      ...(issues ? { details: issues } : {}),
    },
  });
};

const notFoundError = (res: Response, message: string): void => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message },
  });
};

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ai-agent',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.post(
    '/message',
    asyncHandler(async (req, res) => {
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, 'Invalid message payload', parsed.error.issues);
        return;
      }

      const result = await deps.agent.processMessage(parsed.data);
      res.status(200).json({ success: true, phone: parsed.data.phone, ...result });
    })
  );

  app.post(
    '/reset',
    asyncHandler(async (req, res) => {
      const parsed = resetSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, 'Invalid reset payload', parsed.error.issues);
        return;
      }

      await deps.agent.resetSession(parsed.data.phone);
      res.status(200).json({ success: true, phone: parsed.data.phone });
    })
  );

  app.post(
    '/api/rag/upload',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const file = req.file;
      if (!file) {
        validationError(res, 'A file is required');
        return;
      }

      const isPdf =
        file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        validationError(res, 'Only PDF files are supported');
        return;
      }

      const data = await deps.rag.uploadDocument({
        fileName: file.originalname,
        data: file.buffer,
      });
      res.status(201).json({ success: true, data });
    })
  );

  app.get(
    '/api/rag/documents',
    asyncHandler(async (_req, res) => {
      const documents = await deps.rag.listDocuments();
      res.status(200).json({ success: true, data: { documents } });
    })
  );

  app.get(
    '/api/rag/stats',
    asyncHandler(async (_req, res) => {
      const stats = await deps.rag.stats();
      res.status(200).json({ success: true, data: stats });
    })
  );

  app.delete(
    '/api/rag/documents/:id',
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const { deleted } = await deps.rag.deleteDocument(id);
      if (!deleted) {
        notFoundError(res, 'Document not found');
        return;
      }
      res.status(200).json({ success: true, data: { id } });
    })
  );

  app.post(
    '/api/rag/search',
    asyncHandler(async (req, res) => {
      const parsed = searchSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, 'Invalid search payload', parsed.error.issues);
        return;
      }

      const results = await deps.rag.search(parsed.data.query, parsed.data.k ?? 5);
      res.status(200).json({ success: true, data: { results } });
    })
  );

  app.post(
    '/api/rag/reindex',
    asyncHandler(async (_req, res) => {
      const result = await deps.rag.reindex();
      res.status(200).json({ success: true, data: result });
    })
  );

  app.use((_req: Request, res: Response) => {
    notFoundError(res, 'Route not found');
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res
        .status(err.statusCode)
        .json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }

    console.error('[ai-agent] unhandled error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  });

  return app;
}
