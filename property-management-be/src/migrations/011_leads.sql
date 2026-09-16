-- Migration: 011_leads
-- Description: Buyer leads extracted by the AI agent, one per conversation.
--              lead_data mirrors the agent's lead_data shape; lead_status is
--              recalculated server-side (cold/warm/hot) and only ever rises.
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id      UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
    name                 VARCHAR(255),
    phone                VARCHAR(32),
    lead_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    lead_score           INTEGER NOT NULL DEFAULT 0,
    lead_status          VARCHAR(20) NOT NULL DEFAULT 'new'
                         CHECK (lead_status IN ('new', 'cold', 'warm', 'hot')),
    needs_human_followup BOOLEAN NOT NULL DEFAULT false,
    next_action          VARCHAR(30),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_score   ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
