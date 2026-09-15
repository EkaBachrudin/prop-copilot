-- Migration: 002_seed_users
-- Description: Seed a default admin account
-- Password (plaintext): Admin123
-- ============================================================================

INSERT INTO users (full_name, email, phone, password_hash, is_active)
VALUES (
    'Admin User',
    'admin@example.com',
    '6281234567800',
    '$2y$10$950mf1eiKTv9Kd7dGiryYOBG6n/NXI8qaL7tSnaP109egLTywlEk6',
    true
) ON CONFLICT (email) DO NOTHING;
