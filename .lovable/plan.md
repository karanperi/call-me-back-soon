
# Reduce Audio File Size for Faster Call Playback

## Problem
There's a noticeable delay after calls are answered before the audio starts playing. This is caused by Twilio needing to download the entire audio file before playback begins. Current audio files are ~383 KB due to ElevenLabs' default high-quality output format.

## Solution
Add the `output_format` parameter to the ElevenLabs API request in `make-call/index.ts` to generate phone-optimized audio files (~75% smaller).

## Important Technical Note
According to the ElevenLabs API documentation, the `output_format` parameter **must be passed as a query parameter in the URL**, not in the request body. This is a common mistake that can cause API errors.

---

## Change Required

**File:** `supabase/functions/make-call/index.ts`

**Location:** Lines 207-225 (ElevenLabs API call)

**Current code:**
```typescript
const elevenLabsResponse = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: personalizedMessage,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  }
);
```

**Updated code:**
```typescript
const elevenLabsResponse = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
  {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: personalizedMessage,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  }
);
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| File size | ~383 KB | ~80 KB |
| Reduction | - | ~75% smaller |
| Call quality | Phone-quality | Phone-quality (no difference) |
| Playback delay | Noticeable | Significantly reduced |

---

## Technical Details

The `mp3_22050_32` format means:
- **MP3 codec**: Universal compatibility
- **22.05 kHz sample rate**: More than sufficient for phone calls (limited to ~8kHz)
- **32 kbps bitrate**: Optimized for voice, smaller file size

This format is ideal for telephony because phone call audio quality is inherently limited, so high-fidelity audio provides no perceptible benefit to the recipient.
