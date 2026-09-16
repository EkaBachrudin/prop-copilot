import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { Message, MessageDirection, SenderType } from '../types';

export interface CreateMessageInput {
  conversationId: string;
  phone: string;
  direction: MessageDirection;
  text: string;
  senderType: SenderType;
  messageType?: string;
  whatsappMessageId?: string | null;
  timestamp?: Date;
}

export interface MessagePage {
  messages: Message[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
}

export const messageExistsByWhatsappId = async (whatsappMessageId: string): Promise<boolean> => {
  const result = await pool.query('SELECT 1 FROM messages WHERE whatsapp_message_id = $1 LIMIT 1', [
    whatsappMessageId,
  ]);
  return result.rows.length > 0;
};

export const createMessage = async (input: CreateMessageInput): Promise<Message> => {
  const result = await pool.query<Message>(
    `INSERT INTO messages
       (conversation_id, phone, direction, message_type, text, whatsapp_message_id, sender_type, timestamp, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      input.conversationId,
      input.phone,
      input.direction,
      input.messageType ?? 'text',
      input.text,
      input.whatsappMessageId ?? null,
      input.senderType,
      input.timestamp ?? new Date(),
    ]
  );
  return result.rows[0];
};

export const listMessages = async (input: {
  conversationId: string;
  page?: number;
  limit?: number;
}): Promise<MessagePage> => {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(200, input.limit || 50);
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ total: string }>(
    'SELECT COUNT(*) AS total FROM messages WHERE conversation_id = $1',
    [input.conversationId]
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);

  const result = await pool.query<Message>(
    `SELECT * FROM messages
     WHERE conversation_id = $1
     ORDER BY timestamp ASC, created_at ASC
     LIMIT $2 OFFSET $3`,
    [input.conversationId, limit, offset]
  );

  return {
    messages: result.rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  };
};

export const getLastOutgoingMessage = async (
  conversationId: string
): Promise<Message | null> => {
  const result = await pool.query<Message>(
    `SELECT * FROM messages
     WHERE conversation_id = $1 AND direction = 'outgoing'
     ORDER BY timestamp DESC, created_at DESC
     LIMIT 1`,
    [conversationId]
  );
  return result.rows[0] ?? null;
};

export const clearConversationMessages = async (conversationId: string): Promise<void> => {
  const conversation = await pool.query('SELECT 1 FROM conversations WHERE id = $1', [
    conversationId,
  ]);
  if (conversation.rows.length === 0) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
};
