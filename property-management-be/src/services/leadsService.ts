import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { Conversation, Lead, LeadData, LeadStatus } from '../types';

const CONVERSATION_COLUMNS = `id, phone, name, last_message_at, user_type, agent_run, unread_count, created_at, updated_at`;

export interface UpsertLeadInput {
  conversationId: string;
  name?: string | null;
  phone?: string | null;
  leadData: LeadData;
  leadScore: number;
  leadStatus: string;
  needsHumanFollowup: boolean;
  nextAction: string | null;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
}

export interface LeadPage {
  leads: Lead[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
}

export const getLeadByConversationId = async (conversationId: string): Promise<Lead | null> => {
  const result = await pool.query<Lead>('SELECT * FROM leads WHERE conversation_id = $1', [
    conversationId,
  ]);
  return result.rows[0] ?? null;
};

export const getLeadById = async (id: string): Promise<Lead> => {
  const result = await pool.query<Lead>('SELECT * FROM leads WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new AppError('Lead not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
};

export const upsertLead = async (input: UpsertLeadInput): Promise<Lead> => {
  const result = await pool.query<Lead>(
    `INSERT INTO leads
       (conversation_id, name, phone, lead_data, lead_score, lead_status, needs_human_followup, next_action, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (conversation_id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       lead_data = EXCLUDED.lead_data,
       lead_score = EXCLUDED.lead_score,
       lead_status = EXCLUDED.lead_status,
       needs_human_followup = EXCLUDED.needs_human_followup,
       next_action = EXCLUDED.next_action,
       updated_at = NOW()
     RETURNING *`,
    [
      input.conversationId,
      input.name ?? null,
      input.phone ?? null,
      JSON.stringify(input.leadData),
      input.leadScore,
      input.leadStatus,
      input.needsHumanFollowup,
      input.nextAction,
    ]
  );
  return result.rows[0];
};

export const listLeads = async (filters: LeadFilters = {}): Promise<LeadPage> => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 20);
  const offset = (page - 1) * limit;
  const search = filters.search?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let index = 1;

  if (filters.status) {
    conditions.push(`lead_status = $${index++}`);
    params.push(filters.status);
  }
  if (search) {
    conditions.push(`(name ILIKE $${index} OR phone ILIKE $${index})`);
    params.push(`%${search}%`);
    index += 1;
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM leads ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);

  const result = await pool.query<Lead>(
    `SELECT * FROM leads
     ${whereClause}
     ORDER BY lead_score DESC, updated_at DESC
     LIMIT $${index++} OFFSET $${index++}`,
    [...params, limit, offset]
  );

  return {
    leads: result.rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  };
};

/** Toggles needs_human_followup and keeps Conversation.agent_run consistent. */
export const toggleLeadAgent = async (
  id: string
): Promise<{ lead: Lead; conversation: Conversation; agent_enabled: boolean }> => {
  const lead = await getLeadById(id);
  const nextNeedsHumanFollowup = !lead.needs_human_followup;
  const agentEnabled = !nextNeedsHumanFollowup;

  const leadResult = await pool.query<Lead>(
    'UPDATE leads SET needs_human_followup = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, nextNeedsHumanFollowup]
  );

  const conversationResult = await pool.query<Conversation>(
    `UPDATE conversations SET agent_run = $2, updated_at = NOW() WHERE id = $1
     RETURNING ${CONVERSATION_COLUMNS}`,
    [lead.conversation_id, agentEnabled]
  );

  return {
    lead: leadResult.rows[0],
    conversation: conversationResult.rows[0],
    agent_enabled: agentEnabled,
  };
};
