-- =============================================================================
-- Migration: Create Contact Events Table
-- Description: Unified event tracking for contact activity timeline
-- =============================================================================

-- Contact Events table
-- Stores events that aren't already tracked elsewhere (notes, calls, tag/status changes)
-- Messages are stored separately in the messages table and merged at query time
CREATE TABLE IF NOT EXISTS contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact reference (required)
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Event type
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'note_added',
    'tag_added',
    'tag_removed',
    'status_changed',
    'call_inbound',
    'call_outbound',
    'manual_message',
    'created'
  )),

  -- Event content (note text, call notes, manual message content)
  content TEXT,

  -- Direction for calls and manual messages
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),

  -- Metadata for additional context
  -- Examples:
  --   tag_added/removed: { "tag_id": "uuid", "tag_name": "VIP" }
  --   status_changed: { "old_status": "new", "new_status": "contacted" }
  --   call: { "duration_seconds": 120, "outcome": "connected" }
  metadata JSONB DEFAULT '{}',

  -- Who created this event (user identifier, 'system', or 'automation')
  created_by VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary index for timeline queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_contact_events_timeline
  ON contact_events(contact_id, created_at DESC);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_contact_events_type
  ON contact_events(event_type);

-- Composite index for paginated timeline queries
CREATE INDEX IF NOT EXISTS idx_contact_events_pagination
  ON contact_events(contact_id, created_at DESC, id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contact_events_updated_at
  BEFORE UPDATE ON contact_events
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_events_updated_at();

-- Row Level Security
ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single-user mode)
CREATE POLICY "Allow all contact_events operations" ON contact_events
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE contact_events IS 'Activity events for contact timeline (notes, calls, tag/status changes)';
COMMENT ON COLUMN contact_events.event_type IS 'Type of event: note_added, tag_added, tag_removed, status_changed, call_inbound, call_outbound, manual_message, created';
COMMENT ON COLUMN contact_events.content IS 'Event content: note text, call notes, or manual message body';
COMMENT ON COLUMN contact_events.direction IS 'Direction for calls/manual_message: inbound or outbound';
COMMENT ON COLUMN contact_events.metadata IS 'Additional context as JSON (tag info, status change details, call outcome, etc.)';
COMMENT ON COLUMN contact_events.created_by IS 'Who triggered this event: user identifier, system, or automation';
