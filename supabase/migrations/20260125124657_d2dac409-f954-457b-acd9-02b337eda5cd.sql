-- Add error_message column to track failure reasons
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS error_message TEXT;