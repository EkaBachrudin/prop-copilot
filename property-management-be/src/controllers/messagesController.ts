import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { handleIncomingMessage, sendManualMessage } from '../lib/agentPipeline';
import { assertTestModeAllowed } from '../lib/testMode';
import { listMessages } from '../services/messagesService';
import { AppError } from '../utils/AppError';

export const getMessagesController = async (req: Request, res: Response): Promise<void> => {
  const conversationId = req.query.conversation_id;
  if (typeof conversationId !== 'string' || !conversationId) {
    throw new AppError('conversation_id is required', 400, 'VALIDATION_ERROR', {
      conversation_id: ['conversation_id is required'],
    });
  }

  const result = await listMessages({
    conversationId,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  });
  res.status(200).json({ success: true, data: result });
};

export const sendMessageController = async (req: Request, res: Response): Promise<void> => {
  const conversationId = req.body.conversation_id;
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (typeof conversationId !== 'string' || !conversationId || !text) {
    throw new AppError('conversation_id and text are required', 400, 'VALIDATION_ERROR', {
      text: ['conversation_id and text are required'],
    });
  }

  const message = await sendManualMessage(conversationId, text);
  res.status(201).json({ success: true, data: { message } });
};

export const simulateMessageController = async (req: Request, res: Response): Promise<void> => {
  await assertTestModeAllowed();

  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (!phone || !text) {
    throw new AppError('phone and text are required', 400, 'VALIDATION_ERROR', {
      phone: ['phone and text are required'],
    });
  }

  const name = typeof req.body.name === 'string' ? req.body.name : undefined;
  const result = await handleIncomingMessage({
    phone,
    name,
    text,
    whatsappMessageId: `sim-${randomUUID()}`,
  });

  res.status(201).json({ success: true, data: result });
};
