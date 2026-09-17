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
