-- Migration: 008_documents
-- Description: Knowledge base documents (non-inventory) uploaded by admins.
--              The extracted + chunked + embedded text lives in the vector
--              store; this table keeps the original PDF blob and metadata.
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type       VARCHAR(20) NOT NULL DEFAULT 'document'
               CHECK (type IN ('document', 'inventory')),
    file_name  VARCHAR(255) NOT NULL,
    pdf_data   BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_type      ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created   ON documents(created_at);
