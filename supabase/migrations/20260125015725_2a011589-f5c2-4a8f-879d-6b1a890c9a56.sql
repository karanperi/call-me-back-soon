-- Make the call-audio bucket private instead of public
UPDATE storage.buckets 
SET public = false 
WHERE id = 'call-audio';

-- Remove the public read access policy
DROP POLICY IF EXISTS "Public read access for call audio" ON storage.objects;

-- Add policy for authenticated users to read their own audio files
CREATE POLICY "Users can read own audio files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'call-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add policy for service role to access all audio (for Twilio via signed URLs)
-- Note: Service role automatically bypasses RLS, so this is just documentation