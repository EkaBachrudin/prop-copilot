import { Request, Response } from 'express';
import {
  deleteConversation,
  findOrCreateConversation,
  getConversationById,
  listConversations,
  updateConversationFields,
} from '../services/conversationsService';
import { clearConversationMessages } from '../services/messagesService';
import { emitConversationUpdated } from '../socket/server';
import { assertTestModeAllowed } from '../lib/testMode';
import { AppError } from '../utils/AppError';

export const getConversationsController = async (req: Request, res: Response): Promise<void> => {
  const result = await listConversations({
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    search: req.query.search as string | undefined,
  });
  res.status(200).json({ success: true, data: result });
};

export const getConversationController = async (req: Request, res: Response): Promise<void> => {
  const conversation = await getConversationById(req.params.id as string);
  res.status(200).json({ success: true, data: { conversation } });
};

export const createConversationController = async (req: Request, res: Response): Promise<void> => {
  await assertTestModeAllowed();

  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  if (!phone) {
    throw new AppError('phone is required', 400, 'VALIDATION_ERROR', {
      phone: ['phone is required'],
    });
  }
  const name = typeof req.body.name === 'string' ? req.body.name : undefined;

  const { conversation, created } = await findOrCreateConversation({ phone, name });
  res.status(created ? 201 : 200).json({
    success: true,
    data: { conversation, existed: !created },
  });
};

export const updateConversationController = async (req: Request, res: Response): Promise<void> => {
  const conversationId = req.body.conversation_id;
  if (typeof conversationId !== 'string' || !conversationId) {
    throw new AppError('conversation_id is required', 400, 'VALIDATION_ERROR', {
      conversation_id: ['conversation_id is required'],
    });
  }

  const conversation = await updateConversationFields(conversationId, {
    name: typeof req.body.name === 'string' ? req.body.name : undefined,
    agent_run: typeof req.body.agent_run === 'boolean' ? req.body.agent_run : undefined,
    unread_count:
      typeof req.body.unread_count === 'number' ? req.body.unread_count : undefined,
  });

  emitConversationUpdated(conversation);
  res.status(200).json({ success: true, data: { conversation } });
};

export const clearConversationController = async (req: Request, res: Response): Promise<void> => {
  const conversationId = req.body.conversation_id;
  if (typeof conversationId !== 'string' || !conversationId) {
    throw new AppError('conversation_id is required', 400, 'VALIDATION_ERROR', {
      conversation_id: ['conversation_id is required'],
    });
  }

  await clearConversationMessages(conversationId);
  await updateConversationFields(conversationId, { unread_count: 0 });
  res.status(200).json({ success: true, message: 'Conversation messages cleared' });
};

export const deleteConversationController = async (req: Request, res: Response): Promise<void> => {
  const conversationId = req.body.conversation_id ?? req.params.id;
  if (typeof conversationId !== 'string' || !conversationId) {
    throw new AppError('conversation_id is required', 400, 'VALIDATION_ERROR', {
      conversation_id: ['conversation_id is required'],
    });
  }

  await deleteConversation(conversationId);
  res.status(200).json({ success: true, message: 'Conversation deleted' });
};
