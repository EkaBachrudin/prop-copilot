-- Migration: 009_conversations
-- Description: WhatsApp conversations. One phone = one conversation
--              (single-tenant). agent_state holds the persisted AI session
--              (history, known lead data, handoff flag) so context survives
--              restarts of the ai-agent service.
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(32) NOT NULL UNIQUE,
    name            VARCHAR(255) DEFAULT '',
    last_message_at TIMESTAMPTZ,
    user_type       VARCHAR(20),
    agent_run       BOOLEAN NOT NULL DEFAULT true,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    agent_state     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone           ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_run       ON conversations(agent_run);
