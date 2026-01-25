-- Drop the existing constraint
ALTER TABLE call_history DROP CONSTRAINT IF EXISTS call_history_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE call_history ADD CONSTRAINT call_history_status_check 
CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'missed', 'voicemail', 'failed']));