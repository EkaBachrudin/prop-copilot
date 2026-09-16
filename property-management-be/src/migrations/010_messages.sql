-- Migration: 010_messages
-- Description: Individual WhatsApp messages. whatsapp_message_id is the
--              idempotency key for incoming Meta events (NULLs are distinct
--              in PostgreSQL, so local/mock messages may omit it).
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    phone               VARCHAR(32) NOT NULL,
    direction           VARCHAR(10) NOT NULL
                        CHECK (direction IN ('incoming', 'outgoing')),
    message_type        VARCHAR(20) NOT NULL DEFAULT 'text',
    text                TEXT NOT NULL DEFAULT '',
    whatsapp_message_id VARCHAR(255) UNIQUE,
    sender_type         VARCHAR(20) NOT NULL DEFAULT 'customer'
                        CHECK (sender_type IN ('customer', 'agent', 'consultant')),
    timestamp           TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_phone        ON messages(phone);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type  ON messages(sender_type);
