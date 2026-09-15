-- Migration: 003_seed_properties
-- Description: Seed sample properties
-- ============================================================================

INSERT INTO properties (name, city, land_area, address, description)
VALUES
    ('Brassia Garden', 'Bekasi', 4564.00, 'Jl. Brassia Raya No. 1, Bekasi', 'Cluster modern dengan akses tol'),
    ('Grand Permata Residence', 'Jakarta Selatan', 5000.00, 'Jl. Permata Raya No. 1, Jakarta Selatan', 'Cluster premium di Jakarta Selatan')
ON CONFLICT DO NOTHING;
