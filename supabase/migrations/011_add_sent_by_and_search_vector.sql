-- Migration: Add sent_by column and full-text search for Sent Messages Dashboard
-- Date: 2025-01-15

-- =============================================================================
-- 1. Add sent_by column for tracking who sent the message
-- =============================================================================

-- Add sent_by column (nullable - NULL means system/automation sent it)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_by UUID NULL;

-- Add comment explaining the column
COMMENT ON COLUMN messages.sent_by IS 'UUID of user who sent the message. NULL indicates system/automation (workflow, bulk).';

-- =============================================================================
-- 2. Add full-text search capability
-- =============================================================================

-- Add generated tsvector column for full-text search on subject + body
-- Using STORED so it's computed once on insert/update, not on every query
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', COALESCE(body, '') || ' ' || COALESCE(subject, ''))
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING GIN (search_vector);

-- =============================================================================
-- 3. Add composite index for sent messages dashboard queries
-- =============================================================================

-- Composite index for common query pattern: outbound messages sorted by created_at
CREATE INDEX IF NOT EXISTS idx_messages_outbound_created
ON messages (created_at DESC)
WHERE direction = 'outbound';

-- Index for filtering by sent_by
CREATE INDEX IF NOT EXISTS idx_messages_sent_by ON messages (sent_by) WHERE sent_by IS NOT NULL;
