-- =============================================================================
-- Migration: Create Notifications Table
-- Description: Notifications for inbound messages and system events
-- =============================================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What triggered the notification
  type VARCHAR(50) NOT NULL CHECK (type IN ('inbound_sms', 'inbound_email', 'workflow_completed', 'workflow_failed', 'system')),

  -- Related entities (optional)
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,

  -- Notification content
  title VARCHAR(255) NOT NULL,
  body TEXT,

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_contact_id ON notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recent ON notifications(is_read, created_at DESC) WHERE is_read = false;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single-user mode)
CREATE POLICY "Allow all notifications operations" ON notifications
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE notifications IS 'User notifications for inbound messages and system events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: inbound_sms, inbound_email, workflow_completed, workflow_failed, system';
COMMENT ON COLUMN notifications.contact_id IS 'Related contact if applicable';
COMMENT ON COLUMN notifications.message_id IS 'Related message if applicable';
COMMENT ON COLUMN notifications.workflow_id IS 'Related workflow if applicable';
COMMENT ON COLUMN notifications.metadata IS 'Additional context data as JSON';
