# Memory: features/voice-to-form
Updated: now

The Voice-to-Form feature allows users to fill reminder forms by speaking natural language instructions. It uses Deepgram Nova-2 for real-time speech-to-text via WebSocket from the browser (1-minute max recording with countdown timer), and Claude claude-sonnet-4-20250514 via the 'parse-voice-reminder' Edge Function for structured data extraction using tool_use.

Key components:
- `src/hooks/useVoiceRecorder.ts` - Audio recording with Deepgram WebSocket streaming
- `src/hooks/useVoiceReminderParser.ts` - React Query mutation for Claude parsing
- `src/hooks/useVoiceDisableStatus.ts` - 24-hour disable state after 2 failures (localStorage)
- `src/components/reminders/VoiceInputSection.tsx` - Accordion UI with recording states
- `supabase/functions/parse-voice-reminder/index.ts` - Claude-based NLU edge function

The voice input populates form fields without auto-creating reminders. Users review and manually submit. Supports medication detection, time parsing ("2pm" → "14:00", "morning" → "09:00"), relative dates ("tomorrow", "next Monday"), and phone number lookup from contacts.

Error handling: 2 consecutive unrelated/unclear inputs trigger a 24-hour disable. Network errors don't count toward the threshold.
