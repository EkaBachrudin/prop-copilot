import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { Conversation } from '../types';

const COLUMNS = `id, phone, name, last_message_at, user_type, agent_run, unread_count, created_at, updated_at`;

export interface ConversationFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ConversationPage {
  conversations: Conversation[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
}

export const findConversationByPhone = async (phone: string): Promise<Conversation | null> => {
  const result = await pool.query<Conversation>(
    `SELECT ${COLUMNS} FROM conversations WHERE phone = $1`,
    [phone]
  );
  return result.rows[0] ?? null;
};

export const getConversationById = async (id: string): Promise<Conversation> => {
  const result = await pool.query<Conversation>(
    `SELECT ${COLUMNS} FROM conversations WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
};

export const findOrCreateConversation = async (input: {
  phone: string;
  name?: string;
  timestamp?: Date;
}): Promise<{ conversation: Conversation; created: boolean }> => {
  const { phone, name, timestamp } = input;

  const existing = await findConversationByPhone(phone);
  if (existing) {
    if (name && !existing.name) {
      const updated = await updateConversationFields(existing.id, { name });
      return { conversation: updated, created: false };
    }
    return { conversation: existing, created: false };
  }

  const inserted = await pool.query<Conversation>(
    `INSERT INTO conversations (phone, name, last_message_at, agent_run, unread_count, created_at, updated_at)
     VALUES ($1, $2, $3, true, 0, NOW(), NOW())
     ON CONFLICT (phone) DO NOTHING
     RETURNING ${COLUMNS}`,
    [phone, name ?? '', timestamp ?? new Date()]
  );

  if (inserted.rows.length > 0) {
    return { conversation: inserted.rows[0], created: true };
  }

  const raced = await findConversationByPhone(phone);
  if (!raced) {
    throw new AppError('Failed to create conversation', 500, 'INTERNAL_ERROR');
  }
  return { conversation: raced, created: false };
};

export const updateConversationFields = async (
  id: string,
  fields: {
    name?: string;
    user_type?: string | null;
    agent_run?: boolean;
    unread_count?: number;
    last_message_at?: Date;
  }
): Promise<Conversation> => {
  const sets: string[] = [];
  const params: unknown[] = [];
  let index = 1;

  if (fields.name !== undefined) {
    sets.push(`name = $${index++}`);
    params.push(fields.name);
  }
  if (fields.user_type !== undefined) {
    sets.push(`user_type = $${index++}`);
    params.push(fields.user_type);
  }
  if (fields.agent_run !== undefined) {
    sets.push(`agent_run = $${index++}`);
    params.push(fields.agent_run);
  }
  if (fields.unread_count !== undefined) {
    sets.push(`unread_count = $${index++}`);
    params.push(fields.unread_count);
  }
  if (fields.last_message_at !== undefined) {
    sets.push(`last_message_at = $${index++}`);
    params.push(fields.last_message_at);
  }

  if (sets.length === 0) {
    return getConversationById(id);
  }

  sets.push('updated_at = NOW()');
  params.push(id);

  const result = await pool.query<Conversation>(
    `UPDATE conversations SET ${sets.join(', ')} WHERE id = $${index} RETURNING ${COLUMNS}`,
    params
  );
  if (result.rows.length === 0) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
};

export const listConversations = async (
  filters: ConversationFilters = {}
): Promise<ConversationPage> => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 30);
  const offset = (page - 1) * limit;
  const search = filters.search?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let index = 1;

  if (search) {
    conditions.push(`(phone ILIKE $${index} OR name ILIKE $${index})`);
    params.push(`%${search}%`);
    index += 1;
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM conversations ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);

  const dataResult = await pool.query<Conversation>(
    `SELECT ${COLUMNS} FROM conversations
     ${whereClause}
     ORDER BY last_message_at DESC NULLS LAST, created_at DESC
     LIMIT $${index++} OFFSET $${index++}`,
    [...params, limit, offset]
  );

  return {
    conversations: dataResult.rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  };
};

export const deleteConversation = async (id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }
};

export const resetAllAgentRun = async (): Promise<void> => {
  await pool.query('UPDATE conversations SET agent_run = true, updated_at = NOW()');
};
