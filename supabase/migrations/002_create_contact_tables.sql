-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    do_not_contact BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contacts_email_unique UNIQUE (email),
    CONSTRAINT contacts_phone_unique UNIQUE (phone),
    CONSTRAINT contacts_status_check CHECK (status IN ('new', 'contacted', 'responded', 'qualified', 'disqualified'))
);

-- Create custom field definitions table
CREATE TABLE IF NOT EXISTS contact_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    options JSONB,
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT custom_fields_name_unique UNIQUE (name),
    CONSTRAINT custom_fields_type_check CHECK (field_type IN ('text', 'number', 'date', 'select'))
);

-- Create custom field values table
CREATE TABLE IF NOT EXISTS contact_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES contact_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT field_values_unique UNIQUE (contact_id, field_id)
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tags_name_unique UNIQUE (name)
);

-- Create contact_tags junction table
CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, tag_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_do_not_contact ON contacts(do_not_contact) WHERE do_not_contact = true;

CREATE INDEX IF NOT EXISTS idx_contact_field_values_contact ON contact_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_field_values_field ON contact_field_values(field_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);

-- Enable Row Level Security (RLS)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - can be restricted later for multi-user)
CREATE POLICY "Allow all operations on contacts" ON contacts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contact_custom_fields" ON contact_custom_fields
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contact_field_values" ON contact_field_values
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tags" ON tags
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contact_tags" ON contact_tags
    FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at columns (reusing function from migration 001)
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_field_values_updated_at ON contact_field_values;
CREATE TRIGGER update_contact_field_values_updated_at
    BEFORE UPDATE ON contact_field_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
