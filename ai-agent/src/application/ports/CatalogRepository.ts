import type {
  CatalogProperty,
  KnownProperty,
  ListingFilters,
  ListingRow,
} from '../../domain/catalog/types';

export interface CatalogRepository {
  getKnownAreas(): Promise<string[]>;
  getKnownProperties(): Promise<KnownProperty[]>;
  fetchCatalog(filters?: ListingFilters): Promise<CatalogProperty[]>;
  fetchAvailableUnits(): Promise<ListingRow[]>;
}
