-- Migration: 001_schema
-- Description: Core schema for the Property Management application
-- Created: 2026-01-01
-- Database: PostgreSQL 13+

-- gen_random_uuid() is built into PostgreSQL 13+; pgcrypto keeps older servers working.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: users
-- Purpose: Application users (single user type, no roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- ============================================================================
-- Table: properties
-- Purpose: A property/cluster that contains blocks and units
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    land_area   NUMERIC(10, 2) CHECK (land_area IS NULL OR land_area >= 0),
    address     TEXT,
    description TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Table: blocks
-- Purpose: A block/section inside a property
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_block_name_per_property UNIQUE (property_id, name)
);

-- ============================================================================
-- Table: units
-- Purpose: A sellable unit inside a block
-- Note: status is managed manually via the API (no lead trigger in this clone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id   UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    land_area  NUMERIC(10, 2) CHECK (land_area IS NULL OR land_area >= 0),
    status     VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'reserved', 'booked', 'sold')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_unit_name_per_block UNIQUE (block_id, name)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active    ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_properties_name    ON properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_city    ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_active  ON properties(is_active);

CREATE INDEX IF NOT EXISTS idx_blocks_property_id ON blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_blocks_name        ON blocks(name);

CREATE INDEX IF NOT EXISTS idx_units_block_id     ON units(block_id);
CREATE INDEX IF NOT EXISTS idx_units_status       ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_name         ON units(name);
