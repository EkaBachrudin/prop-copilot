-- Migration: 004_seed_blocks
-- Description: Seed sample blocks
-- ============================================================================

INSERT INTO blocks (property_id, name)
SELECT p.id, b.name
FROM properties p
JOIN (VALUES
    ('Brassia Garden', 'Blok A'),
    ('Brassia Garden', 'Blok B'),
    ('Brassia Garden', 'Blok C'),
    ('Brassia Garden', 'Blok D'),
    ('Grand Permata Residence', 'Block Anggrek'),
    ('Grand Permata Residence', 'Block Mawar')
) AS b(property_name, name) ON b.property_name = p.name
ON CONFLICT (property_id, name) DO NOTHING;
