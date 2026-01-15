-- Add source column to messages table
-- Tracks how the message was sent: manually, via bulk action, or through workflow automation

-- Add the source column with default 'manual' for existing messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Add check constraint for valid source values
ALTER TABLE messages ADD CONSTRAINT messages_source_check
    CHECK (source IN ('manual', 'bulk', 'workflow'));

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);

-- Update existing messages that were sent via workflow to have correct source
-- (Messages with workflow_execution_id set were sent via workflow)
UPDATE messages
SET source = 'workflow'
WHERE workflow_execution_id IS NOT NULL AND source = 'manual';
