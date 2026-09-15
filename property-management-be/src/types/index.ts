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
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UnitListItem {
  id: string;
  name: string;
  land_area: number | null;
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
  status?: UnitStatus;
}

export interface UpdateUnitDto {
  name?: string;
  land_area?: number;
  status?: UnitStatus;
}
