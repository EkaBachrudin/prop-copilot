-- Migration: 013_seed_listings
-- Description: Populate property_type + price for the seeded units so the
--              RAG listings have realistic attributes. Brassia Garden units
--              are houses, Grand Permata Residence units are shophouses.
--              Prices are derived from land area (IDR per m²).
-- ============================================================================

UPDATE units u
SET property_type = CASE
        WHEN p.name = 'Grand Permata Residence' THEN 'Ruko'
        ELSE 'Rumah'
    END,
    price = ROUND(
        u.land_area * CASE
            WHEN p.name = 'Grand Permata Residence' THEN 15000000
            ELSE 12000000
        END,
        2
    )
FROM blocks b
JOIN properties p ON p.id = b.property_id
WHERE u.block_id = b.id
  AND (u.property_type IS NULL OR u.price IS NULL);
