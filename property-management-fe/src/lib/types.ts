export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

export type PropertyType = 'Rumah' | 'Ruko' | 'Tanah' | 'Apartemen' | 'Komersial' | 'Villa';

export const PROPERTY_TYPES: PropertyType[] = [
  'Rumah',
  'Ruko',
  'Tanah',
  'Apartemen',
  'Komersial',
  'Villa',
];

export const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Unspecified' },
  ...PROPERTY_TYPES.map((type) => ({ value: type, label: type })),
];

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface BlockListItem {
  id: string;
  name: string;
  is_active: boolean;
  total_units: number;
  created_at: string;
  updated_at: string;
}

export interface UnitListItem {
  id: string;
  name: string;
  land_area: number | null;
  price: number | null;
  property_type: PropertyType | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
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

export interface CreatePropertyInput {
  name: string;
  city: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface CreateUnitInput {
  name: string;
  land_area?: number;
  price?: number;
  property_type?: PropertyType;
  status?: UnitStatus;
}

export interface UpdateUnitInput {
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
  last_message_at: string | null;
  user_type: string | null;
  agent_run: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
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
  timestamp: string;
  created_at: string;
}

export type LeadStatus = 'new' | 'cold' | 'warm' | 'hot';

export interface LeadData {
  name: string | null;
  budget: string | null;
  property_type: string | null;
  size: string | null;
  area: string | null;
  purpose: string | null;
  extra_info?: Record<string, unknown>;
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
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSettings {
  id: number;
  company_name: string;
  whatsapp_access_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_verify_token: string | null;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RagDocument {
  id: string;
  type: string;
  file_name: string;
  created_at: string;
  updated_at: string;
}

export interface RagStats {
  inventory: number;
  documentChunks: number;
  documents: number;
}

export interface RagSearchResult {
  content: string;
  metadata: Record<string, unknown>;
  score?: number;
}

export interface CreateConversationInput {
  phone: string;
  name?: string;
}

export interface UpdateConversationInput {
  conversation_id: string;
  name?: string;
  agent_run?: boolean;
  unread_count?: number;
}

export interface SendMessageInput {
  conversation_id: string;
  text: string;
}

export interface SimulateMessageInput {
  phone: string;
  name?: string;
  text: string;
}

export interface UpdateWhatsAppSettingsInput {
  company_name?: string;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_verify_token?: string;
  whatsapp_enabled?: boolean;
}

export const LEAD_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];

export const leadStatusLabel = (status: LeadStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

export const UNIT_STATUS_OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'sold', label: 'Sold' },
];

export const unitStatusLabel = (status: UnitStatus): string =>
  UNIT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
