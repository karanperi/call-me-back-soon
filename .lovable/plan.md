
# Fix: Complete Voice-to-Form Workflow

## Root Cause Analysis

The voice-to-form pipeline has a critical break at the first step:

```text
Browser → deepgram-proxy → Deepgram API
                ↓
        Transcripts NOT forwarded back (!)
                ↓
useVoiceRecorder receives nothing
                ↓
Empty transcript → handleTranscriptFinal("")
                ↓
VoiceInputSection exits early (line 48-52)
                ↓
parse-voice-reminder NEVER called
                ↓
Form stays empty
```

**Key finding**: The `deepgram-proxy` edge function is deployed (logs confirm connections) but:
1. The source code file is **missing** from `supabase/functions/deepgram-proxy/`
2. The function is **not registered** in `supabase/config.toml`
3. The deployed version is **not forwarding transcription data** from Deepgram back to the browser

---

## Files to Create

### 1. `supabase/functions/deepgram-proxy/index.ts`

A WebSocket proxy that:
- Upgrades HTTP connections to WebSocket using Deno's native API
- Connects to Deepgram with the server-side `DEEPGRAM_API_KEY`
- **Bidirectional forwarding**:
  - Browser audio chunks → Deepgram
  - Deepgram transcripts → Browser (this is what's currently broken)
- Proper connection cleanup on disconnect
- Error handling with logging

Key implementation requirements:
- Use `Deno.upgradeWebSocket()` for client connection
- Connect to `wss://api.deepgram.com/v1/listen` with parameters:
  - `model=nova-2`
  - `language=${lang}` (from query param)
  - `smart_format=true`
  - `punctuate=true`
  - `interim_results=true`
- Forward every Deepgram message to the browser as-is

---

## Files to Modify

### 2. `supabase/config.toml`

Add the missing function registration:

```text
[functions.deepgram-proxy]
verify_jwt = false
```

---

## Complete Data Flow After Fix

```text
Step 1: Browser starts recording
        └─> MediaRecorder captures audio chunks

Step 2: Browser connects to deepgram-proxy
        └─> wss://csenulbdattrynafibqw.supabase.co/functions/v1/deepgram-proxy

Step 3: Edge Function connects to Deepgram
        └─> wss://api.deepgram.com/v1/listen
        └─> Uses DEEPGRAM_API_KEY from secrets

Step 4: Audio flows Browser → Proxy → Deepgram
        └─> Every 250ms chunk sent via WebSocket

Step 5: Transcripts flow Deepgram → Proxy → Browser  [CURRENTLY BROKEN]
        └─> JSON with channel.alternatives[0].transcript
        └─> Both interim and final results

Step 6: useVoiceRecorder accumulates transcripts
        └─> finalTranscriptRef.current builds up text

Step 7: User stops → handleTranscriptFinal(text)
        └─> Text passed to VoiceInputSection

Step 8: VoiceInputSection calls parser.mutateAsync(transcript)
        └─> Invokes parse-voice-reminder edge function

Step 9: Claude extracts structured data
        └─> recipient_name, schedule, medications, etc.

Step 10: Form populated via onFormFilled(data)
         └─> handleVoiceFormFilled in CreateReminderDialog
```

---

## Technical Implementation Details

### Deepgram Proxy Logic

```text
1. Parse query params: language (default "en")
2. Upgrade incoming request to WebSocket
3. Build Deepgram URL with params
4. Connect to Deepgram with Authorization header
5. Set up message forwarding:
   - clientWs.onmessage → deepgramWs.send (audio)
   - deepgramWs.onmessage → clientWs.send (transcript JSON)
6. Handle close events from either side
7. Log errors for debugging
```

### Message Format Expectations

Deepgram sends JSON like:
```text
{
  "type": "Results",
  "channel": {
    "alternatives": [{
      "transcript": "remind grandma to take her medicine at 9am",
      "confidence": 0.98
    }]
  },
  "is_final": true
}
```

The proxy must forward this exact JSON to the browser for `useVoiceRecorder.ts` line 170-194 to parse correctly.

---

## Verification Steps

After implementation:

1. Open the New Reminder dialog
2. Tap "Tap to start speaking"
3. Speak: "Remind Mom to call me at 3pm tomorrow"
4. Stop recording
5. Verify:
   - Live transcript appears during recording
   - "Understanding your request..." shows after stop
   - Form fields populate with: Recipient="Mom", Message="call me", Time="15:00", Date=tomorrow
   - Toast shows "Form filled from voice"

---

## No Changes Required

The following components are already correctly implemented:

- `src/hooks/useVoiceRecorder.ts` - Message parsing logic is correct
- `src/components/reminders/VoiceInputSection.tsx` - Flow control is correct
- `src/hooks/useVoiceReminderParser.ts` - API call is correct
- `supabase/functions/parse-voice-reminder/index.ts` - Claude parsing is correct
- `src/components/reminders/CreateReminderDialog.tsx` - Form population is correct

The entire downstream pipeline will work once the proxy forwards transcription data.
