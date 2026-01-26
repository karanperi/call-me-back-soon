# Memory: features/familiar-voice-recording
Updated: now

The "Familiar Voice" feature allows users to record their voice in-browser (10 sec minimum, 60-90 sec recommended) and create a voice clone using ElevenLabs' Instant Voice Clone API. The cloned voice is stored in the `user_voices` table with status tracking ('processing', 'ready', 'failed'). Users can select their custom voice when creating reminders via the `VoiceSelector` component, which shows both AI voices and user's custom voice. The `make-call` edge function handles custom voice lookups and falls back to `friendly_female` if the custom voice is unavailable. Each user is limited to 1 voice clone.
