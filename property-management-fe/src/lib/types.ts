export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

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
  status?: UnitStatus;
}

export interface UpdateUnitInput {
  name?: string;
  land_area?: number;
  status?: UnitStatus;
}

export const UNIT_STATUS_OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'sold', label: 'Sold' },
];

export const unitStatusLabel = (status: UnitStatus): string =>
  UNIT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
