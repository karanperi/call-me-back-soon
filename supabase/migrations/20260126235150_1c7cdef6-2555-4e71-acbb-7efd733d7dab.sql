-- Drop the existing check constraint on reminders.voice
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_voice_check;

-- Add updated check constraint that includes 'custom'
ALTER TABLE public.reminders ADD CONSTRAINT reminders_voice_check 
  CHECK (voice IN ('friendly_female', 'friendly_male', 'custom'));