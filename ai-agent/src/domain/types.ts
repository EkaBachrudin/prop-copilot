export const PROPERTY_TYPES = [
  'Rumah',
  'Ruko',
  'Tanah',
  'Apartemen',
  'Komersial',
  'Villa',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** Fields the agent extracts and accumulates across turns. */
export const KNOWN_KEYS = ['name', 'budget', 'property_type', 'size', 'area', 'purpose'] as const;

export type KnownKey = (typeof KNOWN_KEYS)[number];

/** Fields that contribute to the lead score (name is excluded). */
export const SCORED_FIELDS: KnownKey[] = ['budget', 'property_type', 'area', 'size', 'purpose'];

export type KnownLead = Record<KnownKey, string | null>;

export interface LeadData extends KnownLead {
  extra_info: Record<string, unknown>;
}

export interface AgentResult {
  reply: string;
  user_type: string;
  lead_data: LeadData;
  lead_score: number;
  lead_status: string;
  next_action: string;
  needs_human_followup: boolean;
}

export interface AgentResponse extends AgentResult {
  success: true;
  phone: string;
}

export type ConversationRole = 'human' | 'ai';

/** Framework-agnostic representation of a stored conversation turn. */
export interface ConversationTurn {
  role: ConversationRole;
  content: string;
}

export interface AgentSession {
  history: ConversationTurn[];
  known: KnownLead;
  needs_human_followup: boolean;
  user_type: string;
}

/** Shape persisted in conversations.agent_state (JSONB). */
export interface StoredAgentState {
  history: ConversationTurn[];
  known: KnownLead;
  needs_human_followup: boolean;
  user_type: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  type: string;
  file_name: string;
  created_at: Date;
  updated_at: Date;
}

/** A document ready to be embedded/stored in the vector store. */
export interface StoredDocument {
  content: string;
  metadata: Record<string, unknown>;
}

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  score?: number;
}

export const DOC_TYPE_INVENTORY = 'inventory';
export const DOC_TYPE_DOCUMENT = 'document';

export interface RagStats {
  inventory: number;
  documentChunks: number;
  documents: number;
}
