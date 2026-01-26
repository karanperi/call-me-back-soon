
# Familiar Voice Recording Feature Implementation Plan

## Overview

This plan implements a "Familiar Voice" feature that allows users to record their own voice in-browser and create a voice clone using ElevenLabs' Instant Voice Clone API. Recipients can then hear their loved one's actual voice during reminder calls.

## Architecture Summary

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         VOICES PAGE                                  │
├─────────────────────────────────────────────────────────────────────┤
│  MY VOICES Section                                                   │
│  ├── If has voice: UserVoiceCard (preview, delete, select)         │
│  └── If no voice: "Add Your Voice" card → VoiceRecordingDialog     │
├─────────────────────────────────────────────────────────────────────┤
│  AI VOICES Section (existing)                                        │
│  ├── Friendly Female card                                            │
│  └── Friendly Male card                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    VOICE RECORDING DIALOG                            │
│  Step 1: Introduction → Tips & "Start Recording" button             │
│  Step 2: Recording → Timer, audio level, script to read             │
│  Step 3: Review → Playback, name input, consent checkbox            │
│  Step 4: Processing → Spinner while cloning                         │
│  Step 5: Success → Preview generated voice                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| **Database** | | |
| Migration | Create | `user_voices` table + add `custom_voice_id` to reminders |
| **Edge Functions** | | |
| `supabase/functions/create-voice-clone/index.ts` | Create | Handle ElevenLabs voice cloning API |
| `supabase/functions/preview-voice/index.ts` | Create | Generate TTS preview for cloned voice |
| `supabase/functions/delete-voice-clone/index.ts` | Create | Delete voice from ElevenLabs + DB |
| **Hooks** | | |
| `src/hooks/useUserVoice.ts` | Create | CRUD operations for user voice clones |
| `src/hooks/useAudioRecorder.ts` | Create | Web Audio API recording logic |
| **Components** | | |
| `src/components/voices/VoiceRecordingDialog.tsx` | Create | Multi-step recording wizard |
| `src/components/voices/UserVoiceCard.tsx` | Create | Display user's cloned voice |
| `src/components/voices/VoiceSelector.tsx` | Create | Reusable voice picker (AI + custom) |
| `src/pages/Voices.tsx` | Modify | Add "MY VOICES" section |
| `src/components/reminders/CreateReminderDialog.tsx` | Modify | Use VoiceSelector component |
| `src/components/reminders/MedicationReminderForm.tsx` | Modify | Use VoiceSelector component |
| `src/components/reminders/EditReminderDialog.tsx` | Modify | Use VoiceSelector component |
| `supabase/functions/make-call/index.ts` | Modify | Support custom voice TTS |

---

## Technical Details

### 1. Database Schema Changes

**New table: `user_voices`**
- `id` (UUID, primary key)
- `user_id` (UUID, FK to auth.users, ON DELETE CASCADE)
- `name` (TEXT, required) - User-provided voice name
- `elevenlabs_voice_id` (TEXT, required) - Voice ID from ElevenLabs
- `status` (TEXT) - 'processing' | 'ready' | 'failed'
- `error_message` (TEXT, nullable) - Error details if failed
- `created_at`, `updated_at` (timestamps)

**RLS policies:**
- Users can only view/create/update/delete their own voices
- Limit: 1 voice per user (enforced in edge function)

**Update `reminders` table:**
- Add `custom_voice_id` (UUID, nullable, FK to user_voices, ON DELETE SET NULL)
- Update voice check constraint to allow 'custom' value

### 2. Edge Functions

#### `create-voice-clone/index.ts`

**Flow:**
1. Validate JWT authentication
2. Check if user already has a voice (limit: 1)
3. Accept audio data (base64 + voice name)
4. Create "processing" record in `user_voices`
5. Call ElevenLabs Instant Voice Clone API:
   - Endpoint: `POST https://api.elevenlabs.io/v1/voices/add`
   - Multipart form data: name, audio file, description
6. Update record with `elevenlabs_voice_id` + status 'ready'
7. Handle errors: update status to 'failed' with message

**ElevenLabs API details:**
- Uses existing `ELEVENLABS_API_KEY` secret
- Returns voice_id on success

#### `preview-voice/index.ts`

**Flow:**
1. Validate JWT
2. Accept voice_id parameter
3. Call ElevenLabs TTS API with sample text: "This is a small reminder to smile today."
4. Return audio as base64
5. Consider caching preview (store in storage bucket)

#### `delete-voice-clone/index.ts`

**Flow:**
1. Validate JWT
2. Verify user owns the voice
3. Call ElevenLabs delete API: `DELETE https://api.elevenlabs.io/v1/voices/{voice_id}`
4. Delete from `user_voices` table
5. Update any reminders using this voice to fall back to 'friendly_female'

### 3. React Hooks

#### `useUserVoice.ts`

```text
- useUserVoice(): Query hook to fetch user's voice clone
- useCreateVoiceClone(): Mutation to upload recording and create clone
- useDeleteVoiceClone(): Mutation to delete voice
- usePreviewVoice(): Fetch TTS preview audio
```

Pattern follows existing hooks (useProfile, useReminders).

#### `useAudioRecorder.ts`

Custom hook encapsulating Web Audio API:

```text
State:
- isRecording: boolean
- duration: number (seconds)
- audioLevel: number (0-1 for visualization)
- audioBlob: Blob | null

Methods:
- startRecording(): Request mic permission, start MediaRecorder
- stopRecording(): Stop recorder, return blob
- resetRecording(): Clear state

Uses:
- navigator.mediaDevices.getUserMedia({ audio: true })
- MediaRecorder with mimeType 'audio/webm'
- AudioContext + AnalyserNode for real-time levels
```

### 4. UI Components

#### `VoiceRecordingDialog.tsx`

Multi-step wizard with 5 steps:

**Step 1: Introduction**
- Microphone icon
- Explanation text: "Your loved ones will hear YOUR voice"
- Tips list (quiet place, speak naturally, hold device 6-8" away)
- Duration info: "10 sec min, 60-90 sec recommended"
- "Start Recording" button

**Step 2: Recording**
- Red recording indicator with timer (MM:SS format)
- Audio level visualization (animated bar)
- Script to read aloud in a styled box:
  > "Hi, this is [name]. I'm recording my voice so I can send you personalized reminders. I want to make sure you're taking care of yourself and taking your medications on time. I love you and think of you every day."
- "Stop Recording" button
- Footer: "Minimum: 10 sec | Recommended: 60 sec"

**Step 3: Review**
- Audio playback controls (play/pause, seek bar, duration)
- Voice name input (default: "My Voice")
- Consent checkbox: "I confirm this is my own voice and I have the right to clone it"
- "Re-record" and "Create Voice" buttons
- Soft warning if < 60 seconds (optional continue)

**Step 4: Processing**
- Spinner
- "Processing your voice..." text
- "This usually takes 30-60 seconds"

**Step 5: Success**
- Checkmark icon
- "Your voice is ready to use!"
- Preview button with sample audio
- "Done" button

**Error handling:**
- Mic permission denied: Show helpful message with browser instructions
- API failure: Show retry option
- Network error: Show connection message

#### `UserVoiceCard.tsx`

Displays user's cloned voice in the "MY VOICES" section.

**Props:** voice, isSelected, onSelect, onDelete, onPreview

**States:**
- `processing`: Spinner + "Creating voice..." text
- `ready`: Voice card with preview/select/delete buttons
- `failed`: Error state with "Try Again" button

**Visual design:**
- Same card style as AI voice cards
- Gradient: Custom purple-to-green for user voice
- Play preview button, delete button (trash icon)

#### `VoiceSelector.tsx`

Reusable component for selecting voices in reminder forms.

**Props:**
```text
selectedVoice: 'friendly_female' | 'friendly_male' | 'custom'
customVoiceId?: string
onSelect: (voice, customVoiceId?) => void
```

**Rendering:**
- "My Voices" section (only if user has voice)
  - User's voice card with preview button
- "AI Voices" section header
  - Friendly Female card
  - Friendly Male card

### 5. Page & Form Updates

#### `Voices.tsx` Updates

Add new section structure:

```text
<PageHeader />

<div className="max-w-lg mx-auto px-4 py-4">
  {/* MY VOICES section */}
  <p className="uppercase tracking-wider mb-3">My Voices</p>
  
  {userVoice ? (
    <UserVoiceCard 
      voice={userVoice}
      isSelected={profile.default_voice === 'custom'}
      onSelect={...}
      onDelete={...}
      onPreview={...}
    />
  ) : (
    <AddVoiceCard onClick={() => setShowRecordingDialog(true)} />
  )}
  
  {/* AI VOICES section (existing) */}
  <p className="uppercase tracking-wider mb-3">AI Voices</p>
  <div className="grid grid-cols-2 gap-3">
    {/* Existing voice cards */}
  </div>
</div>

<VoiceRecordingDialog 
  open={showRecordingDialog} 
  onOpenChange={setShowRecordingDialog}
  onSuccess={() => refetchUserVoice()}
/>
```

**"Add Your Voice" card design:**
- Dashed border: `border-2 border-dashed border-muted-foreground/30`
- Microphone icon centered
- Text: "Add Your Voice"
- Subtext: "Record your voice to make reminders more personal"

#### Reminder Form Updates

Replace hardcoded voice selection grids with `<VoiceSelector />` component in:
- `CreateReminderDialog.tsx`
- `MedicationReminderForm.tsx`
- `EditReminderDialog.tsx`

Voice state changes:
- Current: `voice: 'friendly_female' | 'friendly_male'`
- New: `voice: 'friendly_female' | 'friendly_male' | 'custom'`
- New: `customVoiceId?: string`

When submitting reminder:
- If `voice === 'custom'`, set `custom_voice_id` to the user's voice ID
- Otherwise, set `custom_voice_id` to null

### 6. Make-Call Edge Function Updates

Modify `make-call/index.ts` to handle custom voices:

```text
Current voice mapping:
const voiceMap = {
  friendly_female: "caMurMrvWp0v3NFJALhl",
  friendly_male: "VR6AewLTigWG4xSOukaG",
};

New logic:
1. Check if voice === 'custom' and custom_voice_id exists
2. If so, fetch user_voices record to get elevenlabs_voice_id
3. Use that voice ID for TTS
4. Fallback to friendly_female if voice lookup fails
```

---

## Implementation Order

### Phase 1: Database & Types
1. Create migration for `user_voices` table
2. Add `custom_voice_id` column to reminders
3. Wait for types regeneration

### Phase 2: Edge Functions
1. Create `create-voice-clone/index.ts`
2. Create `preview-voice/index.ts`
3. Create `delete-voice-clone/index.ts`
4. Deploy and test each function

### Phase 3: Hooks
1. Create `useAudioRecorder.ts`
2. Create `useUserVoice.ts`
3. Test recording and API integration

### Phase 4: UI Components
1. Create `VoiceRecordingDialog.tsx` (all 5 steps)
2. Create `UserVoiceCard.tsx`
3. Update `Voices.tsx` with new sections

### Phase 5: Voice Selection Integration
1. Create `VoiceSelector.tsx`
2. Update `CreateReminderDialog.tsx`
3. Update `MedicationReminderForm.tsx`
4. Update `EditReminderDialog.tsx`

### Phase 6: Call Integration
1. Update `make-call/index.ts` for custom voice support
2. Test end-to-end flow

---

## Error Handling Summary

| Scenario | User Message |
|----------|--------------|
| Microphone permission denied | "Unable to access microphone. Please check your browser permissions." |
| Recording < 10 seconds | "Recording must be at least 10 seconds. You recorded X seconds." |
| ElevenLabs API failure | "We couldn't create your voice. Please try again." |
| Network error | "Connection error. Please check your internet and try again." |
| Voice deleted but reminder uses it | Automatically fallback to friendly_female voice |

---

## Security Considerations

1. **RLS policies** ensure users can only access their own voices
2. **JWT validation** in all edge functions
3. **User ownership verification** before delete operations
4. **Consent checkbox** required before voice cloning
5. **ElevenLabs API key** stored securely as edge function secret

---

## What Will NOT Change

- Existing AI voice functionality
- Current voice preview placeholder behavior
- Filter pills on Voices page (decorative)
- Any call history or reminder viewing features
- Contact picker functionality
