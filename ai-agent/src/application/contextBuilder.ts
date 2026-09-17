import { parseBudgetToIdr } from '../domain/budget/parseBudget';
import { buildPropertyCatalogBlock, buildUnitDetailBlock } from '../domain/catalog/catalogBlocks';
import type { CatalogProperty, KnownProperty } from '../domain/catalog/types';
import { wantsUnitDetail } from '../domain/catalog/wantsUnitDetail';
import { detectMatchingAreas, detectMatchingProperties } from '../domain/matching/matchAreas';
import { buildKnownDataBlock, hasText, missingFields } from '../domain/lead/leadData';
import {
  DOC_TYPE_DOCUMENT,
  PROPERTY_TYPES,
  type KnownLead,
  type RetrievedChunk,
} from '../domain/types';
import type { CatalogRepository } from './ports/CatalogRepository';
import type { KnowledgeRepository } from './ports/KnowledgeRepository';

export interface ContextDeps {
  catalog: CatalogRepository;
  knowledge: KnowledgeRepository;
  topK: number;
  unitDetailLimit: number;
}

export interface BuiltContext {
  context: string;
  matchedCities: string[];
  knownCities: string[];
  matchedProperties: KnownProperty[];
}

export async function buildContext(
  deps: ContextDeps,
  userMessage: string,
  known: KnownLead
): Promise<BuiltContext> {
  const knownCities = await deps.catalog.getKnownAreas();
  const matchedCities = detectMatchingAreas(userMessage, knownCities);

  let knownProperties: KnownProperty[] = [];
  try {
    knownProperties = await deps.catalog.getKnownProperties();
  } catch (error) {
    console.error('[agent] property lookup failed', error);
  }
  const matchedProperties = detectMatchingProperties(userMessage, knownProperties);

  let docChunks: RetrievedChunk[] = [];
  try {
    docChunks = await deps.knowledge.retrieve(userMessage, deps.topK, {
      doc_type: DOC_TYPE_DOCUMENT,
    });
  } catch (error) {
    console.error('[agent] retrieval failed', error);
  }

  const areaValue = hasText(known.area) ? known.area : null;
  const storedCity = areaValue
    ? knownCities.find((city) => city.toLowerCase() === areaValue.toLowerCase())
    : undefined;
  const projectCities = [...new Set(matchedProperties.map((property) => property.city))].filter(
    (city) =>
      hasText(city) &&
      knownCities.some((knownCity) => knownCity.toLowerCase() === city.toLowerCase())
  );
  const cities =
    matchedCities.length > 0 ? matchedCities : storedCity ? [storedCity] : projectCities;

  const propertyIds = matchedProperties.map((property) => property.id);
  const scopedToProperty = propertyIds.length > 0;

  let catalog: CatalogProperty[] = [];
  if (cities.length > 0) {
    const messageTypes = PROPERTY_TYPES.filter((type) =>
      new RegExp(`\\b${type}\\b`, 'i').test(userMessage)
    );
    const propertyType = hasText(known.property_type)
      ? known.property_type
      : messageTypes.length === 1
        ? messageTypes[0]
        : undefined;
    const maxPrice = parseBudgetToIdr(userMessage) ?? parseBudgetToIdr(known.budget);

    const fetchCatalog = (overrides: Partial<Parameters<CatalogRepository['fetchCatalog']>[0]>) =>
      deps.catalog.fetchCatalog({
        cities,
        propertyIds: scopedToProperty ? propertyIds : undefined,
        propertyType,
        maxPrice,
        ...overrides,
      });

    try {
      catalog = await fetchCatalog({});
      if (catalog.length === 0) catalog = await fetchCatalog({ maxPrice: null });
      if (catalog.length === 0)
        catalog = await fetchCatalog({ maxPrice: null, propertyType: null });
      if (catalog.length === 0 && scopedToProperty) {
        catalog = await deps.catalog.fetchCatalog({ cities });
      }
    } catch (error) {
      console.error('[agent] catalog failed', error);
    }
  }

  const parts: string[] = [];
  if (knownCities.length > 0) {
    parts.push(`[AVAILABLE AREAS]\n${knownCities.join(', ')}`);
  }
  if (docChunks.length > 0) {
    parts.push(
      `[KNOWLEDGE BASE]\n${docChunks.map((chunk) => chunk.content).join('\n')}\n[/KNOWLEDGE BASE]`
    );
  }
  if (catalog.length > 0) {
    parts.push(buildPropertyCatalogBlock(catalog));
    const totalUnits = catalog.reduce((total, property) => total + property.available_count, 0);
    if (wantsUnitDetail(userMessage, catalog) || totalUnits <= deps.unitDetailLimit) {
      parts.push(buildUnitDetailBlock(catalog, deps.unitDetailLimit));
    }
  }

  return { context: parts.join('\n\n'), matchedCities, knownCities, matchedProperties };
}

export function buildAugmentedMessage(
  phone: string,
  name: string | undefined,
  message: string,
  known: KnownLead,
  ragContext: string
): string {
  const identity = `[Customer Phone: ${phone}] [Customer Name: ${name || 'unknown'}]`;
  const knownBlock = buildKnownDataBlock(known);
  const missing = missingFields(known);
  const schemaReminder = [
    '[SYSTEM REMINDER] Reply with ONLY a single valid JSON object (no markdown, no prose).',
    `Fields still missing: ${missing.length > 0 ? missing.join(', ') : 'none'}.`,
  ].join('\n');

  return [identity, knownBlock, ragContext, schemaReminder, message].filter(Boolean).join('\n\n');
}
