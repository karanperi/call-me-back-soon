-- Create public storage bucket for call audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-audio', 'call-audio', true);

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'call-audio');

-- Allow public read access to audio files
CREATE POLICY "Public read access for call audio"
ON storage.objects
FOR SELECT
USING (bucket_id = 'call-audio');

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'call-audio' AND auth.uid()::text = (storage.foldername(name))[1]);