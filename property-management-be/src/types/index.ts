// ---------------------------------------------------------------------------
// API envelopes
// ---------------------------------------------------------------------------
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

export const UNIT_STATUSES: UnitStatus[] = ['available', 'reserved', 'booked', 'sold'];

export type PropertyType = 'Rumah' | 'Ruko' | 'Tanah' | 'Apartemen' | 'Komersial' | 'Villa';

export const PROPERTY_TYPES: PropertyType[] = [
  'Rumah',
  'Ruko',
  'Tanah',
  'Apartemen',
  'Komersial',
  'Villa',
];

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface Property {
  id: string;
  name: string;
  city: string;
  land_area: number | null;
  address: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyListItem extends Property {
  total_blocks: number;
  total_units: number;
}

export interface Block {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BlockListItem {
  id: string;
  name: string;
  is_active: boolean;
  total_units: number;
  created_at: Date;
  updated_at: Date;
}

export interface Unit {
  id: string;
  block_id: string;
  name: string;
  land_area: number | null;
  price: number | null;
  property_type: PropertyType | null;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UnitListItem {
  id: string;
  name: string;
  land_area: number | null;
  price: number | null;
  property_type: PropertyType | null;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyDetail {
  property: Property;
  blocks: BlockListItem[];
}

export interface BlockInfo {
  id: string;
  name: string;
  property_id: string;
  property_name: string;
}

export interface PaginatedUnitsResponse {
  block: BlockInfo;
  units: UnitListItem[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Query / DTOs
// ---------------------------------------------------------------------------
export interface GetPropertiesQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export interface GetUnitsQuery {
  page?: number;
  limit?: number;
  status?: UnitStatus;
  search?: string;
}

export interface CreatePropertyDto {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface UpdatePropertyDto {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface CreateBlockDto {
  name?: string;
}

export interface UpdateBlockDto {
  name?: string;
}

export interface CreateUnitDto {
  name?: string;
  land_area?: number;
  price?: number;
  property_type?: PropertyType;
  status?: UnitStatus;
}

export interface UpdateUnitDto {
  name?: string;
  land_area?: number;
  price?: number;
  property_type?: PropertyType;
  status?: UnitStatus;
}

// ---------------------------------------------------------------------------
// Conversations / Messages / Leads / Settings (AI WhatsApp CRM)
// ---------------------------------------------------------------------------
export type MessageDirection = 'incoming' | 'outgoing';

export type SenderType = 'customer' | 'agent' | 'consultant';

export interface Conversation {
  id: string;
  phone: string;
  name: string;
  last_message_at: Date | null;
  user_type: string | null;
  agent_run: boolean;
  unread_count: number;
  agent_state?: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  phone: string;
  direction: MessageDirection;
  message_type: string;
  text: string;
  whatsapp_message_id: string | null;
  sender_type: SenderType;
  timestamp: Date;
  created_at: Date;
}

export type LeadStatus = 'new' | 'cold' | 'warm' | 'hot';

export interface LeadData {
  name: string | null;
  budget: string | null;
  property_type: string | null;
  size: string | null;
  area: string | null;
  purpose: string | null;
  extra_info: Record<string, unknown>;
}

export interface Lead {
  id: string;
  conversation_id: string;
  name: string | null;
  phone: string | null;
  lead_data: LeadData;
  lead_score: number;
  lead_status: LeadStatus;
  needs_human_followup: boolean;
  next_action: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  id: number;
  company_name: string;
  whatsapp_access_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_verify_token: string | null;
  whatsapp_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Response contract of the ai-agent `POST /message` endpoint. */
export interface AgentResponsePayload {
  success: true;
  phone: string;
  reply: string;
  user_type: string;
  lead_data: LeadData;
  lead_score: number;
  lead_status: string;
  next_action: string;
  needs_human_followup: boolean;
}

export interface CreateConversationDto {
  phone?: string;
  name?: string;
}

export interface SimulateMessageDto {
  phone?: string;
  name?: string;
  text?: string;
}

export interface SendMessageDto {
  conversation_id?: string;
  text?: string;
}

export interface UpdateWhatsAppSettingsDto {
  company_name?: string;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_verify_token?: string;
  whatsapp_enabled?: boolean;
}
