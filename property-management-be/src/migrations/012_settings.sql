-- Migration: 012_settings
-- Description: Single-tenant singleton Settings row (id = 1). Stores the
--              WhatsApp Cloud API credentials and integration toggle, plus
--              the company name used by the AI agent persona.
--              whatsapp_enabled defaults to false so the local test mode is
--              safe by default; enable it (or set WHATSAPP_API_ENABLED) with
--              real Meta credentials before production use.
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
    id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name            VARCHAR(255) DEFAULT 'Property Management',
    whatsapp_access_token   TEXT,
    whatsapp_phone_number_id VARCHAR(100),
    whatsapp_verify_token   VARCHAR(255),
    whatsapp_enabled        BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
