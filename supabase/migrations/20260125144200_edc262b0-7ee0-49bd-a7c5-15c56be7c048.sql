-- Add column to store Twilio Call SID for linking callbacks
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_history_twilio_sid ON call_history(twilio_call_sid);