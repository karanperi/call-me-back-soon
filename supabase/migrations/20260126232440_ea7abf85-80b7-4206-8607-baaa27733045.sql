-- Create user_voices table for storing cloned voices
CREATE TABLE public.user_voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    elevenlabs_voice_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' 
        CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_voices
CREATE POLICY "Users can view their own voices"
ON public.user_voices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voices"
ON public.user_voices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voices"
ON public.user_voices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voices"
ON public.user_voices FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_voices_updated_at
BEFORE UPDATE ON public.user_voices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add custom_voice_id column to reminders table
ALTER TABLE public.reminders 
    ADD COLUMN custom_voice_id UUID REFERENCES public.user_voices(id) ON DELETE SET NULL;