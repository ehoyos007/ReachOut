-- Create workflow_enrollments table
-- Tracks which contacts are enrolled in which workflows
CREATE TABLE IF NOT EXISTS workflow_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    stop_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workflow_enrollments_status_check CHECK (status IN ('active', 'paused', 'completed', 'stopped', 'failed')),
    CONSTRAINT workflow_enrollments_unique UNIQUE (workflow_id, contact_id)
);

-- Create workflow_executions table
-- Tracks the current state of each contact's progress through a workflow
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES workflow_enrollments(id) ON DELETE CASCADE,
    current_node_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    execution_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workflow_executions_status_check CHECK (status IN ('waiting', 'processing', 'completed', 'failed', 'skipped'))
);

-- Create workflow_execution_logs table
-- Audit trail of all execution steps
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES workflow_enrollments(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workflow_execution_logs_status_check CHECK (status IN ('started', 'completed', 'failed', 'skipped'))
);

-- Create indexes for workflow_enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_workflow_id ON workflow_enrollments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_contact_id ON workflow_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON workflow_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON workflow_enrollments(enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON workflow_enrollments(workflow_id, status) WHERE status = 'active';

-- Create indexes for workflow_executions
CREATE INDEX IF NOT EXISTS idx_executions_enrollment_id ON workflow_executions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_next_run ON workflow_executions(next_run_at) WHERE status = 'waiting' AND next_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executions_processing ON workflow_executions(status) WHERE status = 'processing';

-- Create indexes for workflow_execution_logs
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_enrollment_id ON workflow_execution_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON workflow_execution_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - can be restricted later for multi-user)
CREATE POLICY "Allow all operations on workflow_enrollments" ON workflow_enrollments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on workflow_executions" ON workflow_executions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on workflow_execution_logs" ON workflow_execution_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_workflow_enrollments_updated_at ON workflow_enrollments;
CREATE TRIGGER update_workflow_enrollments_updated_at
    BEFORE UPDATE ON workflow_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint to messages table for workflow_execution_id
-- (column already exists, just adding the constraint)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_workflow_execution_id_fkey'
    ) THEN
        ALTER TABLE messages
        ADD CONSTRAINT messages_workflow_execution_id_fkey
        FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id) ON DELETE SET NULL;
    END IF;
END $$;
