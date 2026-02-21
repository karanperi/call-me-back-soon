

# Fix: Two-Bug Race Condition in Voice Recording Pipeline

## Problem Summary

The voice recording pipeline has two race conditions that prevent transcripts from ever reaching the browser:

1. **Proxy drops early audio**: Audio chunks arrive before Deepgram's WebSocket is open, and are silently discarded
2. **Client closes connection too early**: `stopRecording()` immediately destroys the WebSocket, but Deepgram's transcript hasn't arrived yet

## Evidence from Logs

```text
Browser Console (in order):
  [Voice] Audio chunk available, size: 630     -- chunks sending fine
  [Voice] Sent audio chunk to proxy            -- proxy receiving them
  ... (20+ chunks) ...
  [Voice] stopRecording called, isRecording: true
  [Voice] Final transcript before cleanup:     -- EMPTY! Nothing received
  [Voice] WebSocket closed: 1005               -- Connection killed
  [Voice] Calling onTranscriptFinal with:      -- Empty string passed

Server Logs:
  "Deepgram not ready, state: 0"               -- Early chunks DROPPED
  "Deepgram message received, length: 409"     -- Transcript came back...
  "Forwarded to client"                        -- ...but client already closed
```

## Fix 1: Buffer Audio in Proxy Until Deepgram Ready

**File: `supabase/functions/deepgram-proxy/index.ts`**

Add a buffer array that stores audio chunks received before Deepgram is connected. Once Deepgram's `onopen` fires, flush the buffer, then forward directly.

```text
Changes:
- Add audioBuffer array
- In clientSocket.onmessage: if Deepgram not ready, push to buffer
- In deepgramSocket.onopen: flush buffer, then clear it
- Keep direct forwarding for chunks arriving after connection
```

## Fix 2: Graceful Shutdown in Client

**File: `src/hooks/useVoiceRecorder.ts`**

Instead of immediately closing the WebSocket on stop, keep it open to receive pending transcripts:

```text
Changes to stopRecording():
1. Stop MediaRecorder (no more audio sent)
2. Stop the countdown timer
3. Stop audio tracks
4. Keep WebSocket OPEN (don't call cleanup yet)
5. Set a 3-second timeout as safety net
6. When a final transcript arrives via onmessage, THEN close and call onTranscriptFinal
7. If timeout fires with no new data, use whatever was accumulated and close
```

The WebSocket `onmessage` handler already accumulates text in `finalTranscriptRef`. The fix just keeps the connection alive long enough for Deepgram to respond.

## Technical Details

### Proxy Changes (`supabase/functions/deepgram-proxy/index.ts`)

- Declare `let audioBuffer: ArrayBuffer[] = []` alongside `deepgramSocket`
- In `clientSocket.onmessage`: check `deepgramSocket?.readyState === WebSocket.OPEN`, if not, push `event.data` to buffer
- In `deepgramSocket.onopen`: iterate buffer and send each chunk, then clear buffer
- No other changes to message forwarding logic

### Client Changes (`src/hooks/useVoiceRecorder.ts`)

- Add a new ref `waitingForFinalRef` to track graceful shutdown state
- In `stopRecording`:
  - Set `waitingForFinalRef.current = true`
  - Stop MediaRecorder and audio tracks
  - Stop timer
  - Do NOT close WebSocket yet
  - Set a 3-second safety timeout that calls cleanup + onTranscriptFinal
- In the WebSocket `onmessage` handler (inside `startRecording`):
  - After receiving a final transcript while `waitingForFinalRef` is true, call cleanup + onTranscriptFinal and clear the safety timeout

### Files Modified

1. `supabase/functions/deepgram-proxy/index.ts` -- add audio buffering
2. `src/hooks/useVoiceRecorder.ts` -- graceful shutdown with transcript wait

### No Other Files Need Changes

The downstream pipeline (VoiceInputSection, parse-voice-reminder, CreateReminderDialog) is correctly implemented and will work once transcripts actually reach the browser.

