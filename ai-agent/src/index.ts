import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { processMessage, resetSession } from './agent/agent';
import { config } from './shared/config';
import { closePool, ensureVectorExtension, testConnection } from './shared/db';
import { deleteDocument, insertDocument, listDocuments } from './rag/documents';
import { extractPdfText } from './rag/pdfText';
import {
  getRagStats,
  ingestDocumentText,
  reindex,
  removeDocumentEmbeddings,
  retrieve,
} from './rag/rag';
import { getVectorStore } from './rag/vectorstore';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

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

    const result = await processMessage(parsed.data);
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

    await resetSession(parsed.data.phone);
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

    const text = await extractPdfText(file.buffer);
    if (!text) {
      validationError(res, 'No extractable text found in the PDF');
      return;
    }

    const document = await insertDocument(file.originalname, file.buffer);
    try {
      const chunks = await ingestDocumentText(text, {
        refId: document.id,
        source: document.file_name,
      });
      res.status(201).json({ success: true, data: { document, chunks } });
    } catch (error) {
      await deleteDocument(document.id);
      throw error;
    }
  })
);

app.get(
  '/api/rag/documents',
  asyncHandler(async (_req, res) => {
    const documents = await listDocuments();
    res.status(200).json({ success: true, data: { documents } });
  })
);

app.get(
  '/api/rag/stats',
  asyncHandler(async (_req, res) => {
    const stats = await getRagStats();
    res.status(200).json({ success: true, data: stats });
  })
);

app.delete(
  '/api/rag/documents/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await removeDocumentEmbeddings(id);
    const deleted = await deleteDocument(id);
    if (!deleted) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
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

    const results = await retrieve(parsed.data.query, parsed.data.k ?? 5);
    res.status(200).json({ success: true, data: { results } });
  })
);

app.post(
  '/api/rag/reindex',
  asyncHandler(async (_req, res) => {
    const result = await reindex();
    res.status(200).json({ success: true, data: result });
  })
);

app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ai-agent] unhandled error', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
  });
});

const start = async (): Promise<void> => {
  const connected = await testConnection();
  if (!connected) {
    console.error('[ai-agent] database unreachable, exiting');
    process.exit(1);
  }

  try {
    await ensureVectorExtension();
    await getVectorStore();
    console.log('[ai-agent] vector store ready');
  } catch (error) {
    console.error('[ai-agent] vector store init failed', error);
  }

  app.listen(config.port, () => {
    console.log(`[ai-agent] listening on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

void start();

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export default app;
