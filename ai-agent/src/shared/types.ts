import type { BaseMessage } from '@langchain/core/messages';

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

export interface AgentSession {
  history: BaseMessage[];
  known: KnownLead;
  needs_human_followup: boolean;
  user_type: string;
}

/** Shape persisted in conversations.agent_state (JSONB). */
export interface StoredAgentState {
  history: Array<{ role: 'human' | 'ai'; content: string }>;
  known: KnownLead;
  needs_human_followup: boolean;
  user_type: string;
  updated_at: string;
}

export interface ListingRow {
  unit_id: string;
  unit_name: string;
  block_id: string;
  block_name: string;
  property_id: string;
  property_name: string;
  area: string;
  address: string | null;
  property_type: string | null;
  land_area: string | number | null;
  price: string | number | null;
  status: string;
  description: string | null;
}

export interface KnownProperty {
  id: string;
  name: string;
  city: string;
}

export interface ListingFilters {
  cities?: string[];
  propertyIds?: string[];
  propertyType?: string | null;
  maxPrice?: number | null;
}

export interface CatalogUnit {
  unit_id: string;
  unit_name: string;
  property_type: string | null;
  land_area: number | null;
  price: number | null;
  status: string;
}

export interface CatalogBlock {
  block_id: string;
  block_name: string;
  units: CatalogUnit[];
  available_count: number;
  price_min: number | null;
  price_max: number | null;
  size_min: number | null;
  size_max: number | null;
  types: string[];
}

export interface CatalogProperty {
  property_id: string;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  available_count: number;
  price_min: number | null;
  price_max: number | null;
  types: string[];
  blocks: CatalogBlock[];
}

export interface DocumentRow {
  id: string;
  type: string;
  file_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  score?: number;
}
