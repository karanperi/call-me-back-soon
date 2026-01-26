-- Drop the existing check constraint on profiles.default_voice
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_voice_check;

-- Add updated check constraint that includes 'custom' as a valid voice
ALTER TABLE public.profiles ADD CONSTRAINT profiles_default_voice_check 
  CHECK (default_voice IS NULL OR default_voice IN ('friendly_female', 'friendly_male', 'custom'));