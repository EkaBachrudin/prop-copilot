-- Migration: 005_seed_units
-- Description: Seed sample units (11 per block, mixed statuses on Blok A)
-- ============================================================================

-- Blok A (Brassia Garden): A1..A11 with a couple of non-available statuses
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id,
       'A' || s.i,
       84.00,
       CASE
           WHEN s.i = 3 THEN 'sold'
           WHEN s.i = 4 THEN 'reserved'
           WHEN s.i = 5 THEN 'booked'
           ELSE 'available'
       END
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 11) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok A'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok B (Brassia Garden): B1..B10
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'B' || s.i, 84.00 + s.i, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 10) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok B'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok C (Brassia Garden): C1..C16
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'C' || s.i, 84.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 16) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok C'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok D (Brassia Garden): D1..D11
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'D' || s.i, 82.00 + s.i, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 11) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok D'
ON CONFLICT (block_id, name) DO NOTHING;

-- Grand Permata Residence: Block Anggrek A-1..A-8, Block Mawar B-1..B-8
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'A-' || s.i, 72.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 8) AS s(i) ON true
WHERE p.name = 'Grand Permata Residence' AND b.name = 'Block Anggrek'
ON CONFLICT (block_id, name) DO NOTHING;

INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'B-' || s.i, 90.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 8) AS s(i) ON true
WHERE p.name = 'Grand Permata Residence' AND b.name = 'Block Mawar'
ON CONFLICT (block_id, name) DO NOTHING;
