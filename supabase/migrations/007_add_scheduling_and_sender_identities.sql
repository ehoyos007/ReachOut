-- =============================================================================
-- Migration 007: Add Message Scheduling and Sender Identity Features
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part 1: Message Scheduling
-- -----------------------------------------------------------------------------

-- Add scheduled_at column for future message scheduling
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add from_identity column to store which sender identity was used
-- Format: JSON object with {type: 'sms'|'email', identity_id: string, address: string}
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_identity JSONB;

-- Drop existing status constraint and add new one with 'scheduled' status
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('scheduled', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'));

-- Create index for scheduled message processing
-- Only index scheduled messages that haven't been sent yet
CREATE INDEX IF NOT EXISTS idx_messages_scheduled
  ON messages(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Create composite index for efficient scheduled message queries by contact
CREATE INDEX IF NOT EXISTS idx_messages_contact_scheduled
  ON messages(contact_id, scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Part 2: Sender Identities Settings
-- -----------------------------------------------------------------------------

-- Insert settings keys for sender identities (JSON arrays)
-- Format for sender_emails: [{id, email, name, is_default, verified, created_at}]
-- Format for sender_phones: [{id, phone, label, is_default, created_at}]
INSERT INTO settings (key, value, is_encrypted) VALUES
    ('sender_emails', '[]', false),
    ('sender_phones', '[]', false)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Part 3: Add comment for documentation
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN messages.scheduled_at IS 'Timestamp when the message should be sent. NULL means send immediately.';
COMMENT ON COLUMN messages.from_identity IS 'JSON object storing sender identity: {type, identity_id, address}';
