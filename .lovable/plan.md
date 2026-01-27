
# Fix: Proxy Deepgram Through Edge Function

## Problem

The voice recorder attempts to connect to Deepgram directly from the browser using `import.meta.env.VITE_DEEPGRAM_API_KEY`. However, in Lovable Cloud:
- The `.env` file is auto-managed and cannot include custom `VITE_` variables
- Secrets are stored in Supabase secrets (accessible only in Edge Functions)
- The `VITE_DEEPGRAM_API_KEY` secret exists but is not accessible from the client

## Solution

Create an Edge Function that acts as a WebSocket proxy between the browser and Deepgram. This keeps the API key secure on the server.

---

## Architecture Change

```text
Current (broken):
Browser → WebSocket → Deepgram (needs API key in browser ❌)

Fixed:
Browser → WebSocket → Edge Function (proxy) → WebSocket → Deepgram ✓
                              ↑
                     API key stays here (secure)
```

---

## Files to Create

### 1. `supabase/functions/deepgram-proxy/index.ts`

A WebSocket proxy Edge Function that:
- Accepts WebSocket connections from the browser
- Connects to Deepgram using the server-side `DEEPGRAM_API_KEY`
- Forwards audio data from browser to Deepgram
- Forwards transcripts from Deepgram back to browser
- Handles connection cleanup

---

## Files to Modify

### 1. `src/hooks/useVoiceRecorder.ts`

Changes:
- Remove the `import.meta.env.VITE_DEEPGRAM_API_KEY` check
- Update WebSocket URL to point to the Edge Function proxy instead of Deepgram directly
- Use the project's Supabase URL to construct the WebSocket endpoint
- Remove the API key from WebSocket subprotocol (no longer needed client-side)

### 2. `supabase/config.toml`

Changes:
- Add `[functions.deepgram-proxy]` configuration
- Set `verify_jwt = false` to allow unauthenticated connections (or optionally require auth)

---

## Implementation Details

### Edge Function Proxy Logic

```text
1. Browser connects to: wss://[project-id].supabase.co/functions/v1/deepgram-proxy
2. Edge function receives connection
3. Edge function connects to Deepgram with API key
4. Audio data flows: Browser → Edge Function → Deepgram
5. Transcripts flow: Deepgram → Edge Function → Browser
6. On disconnect, clean up both connections
```

### Client Changes

The hook will connect to:
```typescript
const wsUrl = `wss://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/deepgram-proxy?language=${language}`;
const ws = new WebSocket(wsUrl);  // No API key needed!
```

---

## Security Considerations

- API key remains server-side (never exposed to client)
- Consider adding rate limiting in the Edge Function
- Optionally require user authentication before allowing transcription

---

## Alternative Approach (Simpler but Less Real-time)

If WebSocket proxying proves complex, an alternative is:
1. Record audio in browser using MediaRecorder
2. On stop, upload the audio blob to an Edge Function
3. Edge Function sends audio to Deepgram's batch API
4. Return transcript to browser

This is simpler but loses real-time transcription. The proxy approach preserves the live transcript experience.
