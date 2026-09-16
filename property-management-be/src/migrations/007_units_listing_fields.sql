-- Migration: 007_units_listing_fields
-- Description: Add listing attributes used by the AI sales agent RAG context.
--              A unit is treated as a sellable listing: property_type + price
--              join with the block/property to expose area (city) and
--              description to the retrieval pipeline.
-- ============================================================================

ALTER TABLE units
    ADD COLUMN IF NOT EXISTS price NUMERIC(15, 2)
        CHECK (price IS NULL OR price >= 0),
    ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);

ALTER TABLE units
    DROP CONSTRAINT IF EXISTS units_property_type_check;

ALTER TABLE units
    ADD CONSTRAINT units_property_type_check
        CHECK (
            property_type IS NULL
            OR property_type IN ('Rumah', 'Ruko', 'Tanah', 'Apartemen', 'Komersial', 'Villa')
        );

CREATE INDEX IF NOT EXISTS idx_units_price          ON units(price);
CREATE INDEX IF NOT EXISTS idx_units_property_type  ON units(property_type);
