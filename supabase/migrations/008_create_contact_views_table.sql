-- Migration: Create contact_views table for saved filter views
-- Created: January 15, 2026

-- Contact Views table for storing saved filter configurations
CREATE TABLE IF NOT EXISTS contact_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    icon TEXT DEFAULT 'filter',
    color TEXT DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE contact_views IS 'Stores saved filter views for the contacts page';
COMMENT ON COLUMN contact_views.filters IS 'JSON object containing filter conditions and logic';
COMMENT ON COLUMN contact_views.icon IS 'Lucide icon name for the view';
COMMENT ON COLUMN contact_views.color IS 'Hex color for the view icon/badge';
COMMENT ON COLUMN contact_views.is_default IS 'Whether this view is pinned/default';
COMMENT ON COLUMN contact_views.sort_order IS 'Order in which views appear in sidebar';

-- Indexes
CREATE INDEX idx_contact_views_sort_order ON contact_views(sort_order);
CREATE INDEX idx_contact_views_created_at ON contact_views(created_at DESC);

-- Row Level Security
ALTER TABLE contact_views ENABLE ROW LEVEL SECURITY;

-- RLS policies (permissive for single-user mode, can be restricted later with auth)
CREATE POLICY "Allow all operations on contact_views" ON contact_views
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_contact_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_views_updated_at
    BEFORE UPDATE ON contact_views
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_views_updated_at();
