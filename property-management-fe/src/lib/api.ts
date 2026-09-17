import type {
  Block,
  BlockInfo,
  Conversation,
  CreateConversationInput,
  CreatePropertyInput,
  CreateUnitInput,
  Lead,
  LeadStatus,
  Message,
  PaginationMeta,
  Property,
  PropertyDetail,
  PropertyListItem,
  PublicUser,
  RagDocument,
  RagSearchResult,
  RagStats,
  SendMessageInput,
  SimulateMessageInput,
  UnitListItem,
  UnitStatus,
  UpdateConversationInput,
  UpdatePropertyInput,
  UpdateUnitInput,
  UpdateWhatsAppSettingsInput,
  WhatsAppSettings,
} from './types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code = 'ERROR',
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;

  if (!response.ok) {
    const isLogin = path.includes('/auth/login');
    if (response.status === 401 && !isLogin && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(
      payload?.error?.message || 'Request failed',
      response.status,
      payload?.error?.code || 'ERROR',
      payload?.error?.details
    );
  }

  return payload as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

interface MessageResponse {
  success: true;
  message?: string;
}

interface LoginResponse {
  success: true;
  message?: string;
  data: { user: PublicUser };
}

interface MeResponse {
  success: true;
  data: { user: PublicUser };
}

interface PropertiesResponse {
  success: true;
  data: { properties: PropertyListItem[]; pagination: PaginationMeta };
}

interface PropertyDetailResponse {
  success: true;
  data: PropertyDetail;
}

interface PropertyResponse {
  success: true;
  data: { property: Property };
}

interface BlockResponse {
  success: true;
  data: { block: Block };
}

interface UnitsResponse {
  success: true;
  data: { block: BlockInfo; units: UnitListItem[]; pagination: PaginationMeta };
}

interface ConversationsResponse {
  success: true;
  data: { conversations: Conversation[]; pagination: PaginationMeta };
}

interface ConversationResponse {
  success: true;
  data: { conversation: Conversation; existed?: boolean };
}

interface MessagesResponse {
  success: true;
  data: { messages: Message[]; pagination: PaginationMeta };
}

interface MessageSingleResponse {
  success: true;
  data: { message: Message };
}

interface SimulateResponse {
  success: true;
  data: {
    conversation: Conversation;
    incomingMessage: Message | null;
    replyMessage: Message | null;
    skipped: boolean;
  };
}

interface LeadsResponse {
  success: true;
  data: { leads: Lead[]; pagination: PaginationMeta };
}

interface ToggleLeadResponse {
  success: true;
  data: { lead: Lead; conversation: Conversation; agent_enabled: boolean };
}

interface WhatsappStatusResponse {
  success: true;
  whatsapp_enabled: boolean;
}

interface WhatsappSetupResponse {
  success: true;
  data: { settings: WhatsAppSettings };
}

interface RagDocumentsResponse {
  success: true;
  data: { documents: RagDocument[] };
}

interface RagStatsResponse {
  success: true;
  data: RagStats;
}

interface RagUploadResponse {
  success: true;
  data: { document: RagDocument; chunks: number };
}

interface RagSearchResponse {
  success: true;
  data: { results: RagSearchResult[] };
}

interface ReindexResponse {
  success: true;
  data: { listings: number; documentChunks: number };
}

export interface ListPropertiesParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export interface ListUnitsParams {
  page?: number;
  limit?: number;
  status?: UnitStatus;
  search?: string;
}

export interface ListConversationsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListLeadsParams {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
}

export interface ListMessagesParams {
  conversation_id: string;
  page?: number;
  limit?: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<MessageResponse>('/api/v1/auth/logout', { method: 'POST' }),

  getMe: () => request<MeResponse>('/api/v1/auth/me'),

  getProperties: (params: ListPropertiesParams = {}) =>
    request<PropertiesResponse>(`/api/v1/properties${qs({ ...params })}`),

  getPropertyDetail: (id: string) =>
    request<PropertyDetailResponse>(`/api/v1/properties/${id}`),

  createProperty: (input: CreatePropertyInput) =>
    request<PropertyResponse>('/api/v1/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProperty: (id: string, input: UpdatePropertyInput) =>
    request<PropertyResponse>(`/api/v1/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteProperty: (id: string) =>
    request<MessageResponse>(`/api/v1/properties/${id}`, { method: 'DELETE' }),

  createBlock: (propertyId: string, input: { name: string }) =>
    request<BlockResponse>(`/api/v1/properties/${propertyId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateBlock: (blockId: string, input: { name: string }) =>
    request<BlockResponse>(`/api/v1/blocks/${blockId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteBlock: (blockId: string) =>
    request<MessageResponse>(`/api/v1/blocks/${blockId}`, { method: 'DELETE' }),

  getUnits: (blockId: string, params: ListUnitsParams = {}) =>
    request<UnitsResponse>(`/api/v1/blocks/${blockId}/units${qs({ ...params })}`),

  createUnit: (blockId: string, input: CreateUnitInput) =>
    request<{ success: true; data: { unit: UnitListItem } }>(`/api/v1/blocks/${blockId}/units`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateUnit: (unitId: string, input: UpdateUnitInput) =>
    request<{ success: true; data: { unit: UnitListItem } }>(`/api/v1/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteUnit: (unitId: string) =>
    request<MessageResponse>(`/api/v1/units/${unitId}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------
  getConversations: (params: ListConversationsParams = {}) =>
    request<ConversationsResponse>(`/api/v1/conversations${qs({ ...params })}`),

  getConversation: (id: string) =>
    request<ConversationResponse>(`/api/v1/conversations/${id}`),

  createConversation: (input: CreateConversationInput) =>
    request<ConversationResponse>('/api/v1/conversations/create', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateConversation: (input: UpdateConversationInput) =>
    request<ConversationResponse>('/api/v1/conversations/update', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  clearConversation: (conversationId: string) =>
    request<MessageResponse>('/api/v1/conversations/clear', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  deleteConversation: (conversationId: string) =>
    request<MessageResponse>('/api/v1/conversations/delete', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------
  getMessages: (params: ListMessagesParams) =>
    request<MessagesResponse>(`/api/v1/messages${qs({ ...params })}`),

  sendMessage: (input: SendMessageInput) =>
    request<MessageSingleResponse>('/api/v1/messages/send', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  simulateMessage: (input: SimulateMessageInput) =>
    request<SimulateResponse>('/api/v1/messages/simulate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // -------------------------------------------------------------------------
  // Leads
  // -------------------------------------------------------------------------
  getLeads: (params: ListLeadsParams = {}) =>
    request<LeadsResponse>(`/api/v1/leads${qs({ ...params })}`),

  toggleLeadAgent: (leadId: string) =>
    request<ToggleLeadResponse>(`/api/v1/lead/${leadId}/toggle-agent`, { method: 'PATCH' }),

  // -------------------------------------------------------------------------
  // WhatsApp settings
  // -------------------------------------------------------------------------
  getWhatsappStatus: () => request<WhatsappStatusResponse>('/api/v1/whatsapp/status'),

  getWhatsappSetup: () => request<WhatsappSetupResponse>('/api/v1/whatsapp/setup'),

  updateWhatsappSetup: (input: UpdateWhatsAppSettingsInput) =>
    request<WhatsappSetupResponse>('/api/v1/whatsapp/setup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // -------------------------------------------------------------------------
  // RAG knowledge base
  // -------------------------------------------------------------------------
  getRagDocuments: () =>
    request<RagDocumentsResponse>('/api/v1/rag/documents'),

  getRagStats: () =>
    request<RagStatsResponse>('/api/v1/rag/stats'),

  uploadRagDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<RagUploadResponse>('/api/v1/rag/upload', { method: 'POST', body: form });
  },

  deleteRagDocument: (id: string) =>
    request<MessageResponse>(`/api/v1/rag/documents/${id}`, { method: 'DELETE' }),

  searchRag: (query: string, k?: number) =>
    request<RagSearchResponse>('/api/v1/rag/search', {
      method: 'POST',
      body: JSON.stringify({ query, k }),
    }),

  reindexRag: () =>
    request<ReindexResponse>('/api/v1/rag/reindex', { method: 'POST' }),
};
