import { Router } from 'express';
import {
  deleteRagDocumentController,
  getRagStatsController,
  listRagDocumentsController,
  ragUploadMiddleware,
  reindexRagController,
  searchRagController,
  uploadRagDocumentController,
} from '../controllers/ragController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.post(
  '/rag/upload',
  authenticate,
  ragUploadMiddleware.single('file'),
  uploadRagDocumentController
);
router.get('/rag/documents', authenticate, listRagDocumentsController);
router.get('/rag/stats', authenticate, getRagStatsController);
router.delete('/rag/documents/:id', authenticate, deleteRagDocumentController);
router.post('/rag/search', authenticate, searchRagController);
router.post('/rag/reindex', authenticate, reindexRagController);

export default router;
