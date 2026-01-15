-- =============================================================================
-- Email Templates Cache Table
-- Caches SendGrid dynamic templates locally for faster access
-- =============================================================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SendGrid reference
  sendgrid_id TEXT UNIQUE NOT NULL,

  -- Template metadata
  name TEXT NOT NULL,
  subject TEXT,
  variables JSONB DEFAULT '[]'::jsonb,    -- Extracted variable names
  thumbnail_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Sync tracking
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_sendgrid_id
  ON email_templates(sendgrid_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_active
  ON email_templates(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_templates_synced_at
  ON email_templates(synced_at DESC);

-- =============================================================================
-- Add sendgrid_template_id to messages table (optional reference)
-- =============================================================================

-- Add column to track which SendGrid template was used
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sendgrid_template_id TEXT;

-- Create index for SendGrid template lookups in messages
CREATE INDEX IF NOT EXISTS idx_messages_sendgrid_template
  ON messages(sendgrid_template_id)
  WHERE sendgrid_template_id IS NOT NULL;

-- =============================================================================
-- Auto-update updated_at trigger
-- =============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_email_templates_updated_at ON email_templates;
CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single tenant)
-- In the future, this can be restricted per user/organization
CREATE POLICY "Allow all operations on email_templates"
  ON email_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);
