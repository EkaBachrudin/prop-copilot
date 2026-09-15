import type {
  Block,
  BlockInfo,
  CreatePropertyInput,
  CreateUnitInput,
  PaginationMeta,
  Property,
  PropertyDetail,
  PropertyListItem,
  PublicUser,
  UnitListItem,
  UnitStatus,
  UpdatePropertyInput,
  UpdateUnitInput,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
};
