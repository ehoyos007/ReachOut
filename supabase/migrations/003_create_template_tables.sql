-- Create message templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT, -- For email only
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT templates_name_unique UNIQUE (name),
    CONSTRAINT templates_channel_check CHECK (channel IN ('sms', 'email'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_channel ON templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policy (allowing all operations for now - can be restricted later for multi-user)
CREATE POLICY "Allow all operations on templates" ON templates
    FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at column (reusing function from migration 001)
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
