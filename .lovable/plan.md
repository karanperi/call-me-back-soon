
# Voice-to-Form Feature Implementation Plan

## Overview

This plan implements a voice-to-form feature that allows users to fill in reminder forms by speaking natural language instructions. The voice input **populates the existing form fields** rather than auto-creating reminders, enabling users to review, edit, and manually submit.

---

## Architecture Summary

```text
┌──────────────┐    ┌───────────────┐    ┌──────────────────┐    ┌───────────┐
│   User       │    │  Deepgram     │    │   Claude API     │    │  React    │
│   Voice      │───▶│  Nova-2       │───▶│   (Sonnet)       │───▶│  Form     │
│   Input      │    │  Real-time    │    │  Structured      │    │  State    │
│   (≤1 min)   │    │  Transcription│    │  Data Extraction │    │  Update   │
└──────────────┘    └───────────────┘    └──────────────────┘    └───────────┘
       │                   │                      │                     │
       │              WebSocket              REST API              Existing
       │              (Client)             Edge Function          Form Fields
```

---

## Required API Keys

Two new secrets need to be configured (I'll prompt you to add these during implementation):

1. **DEEPGRAM_API_KEY** - For speech-to-text transcription (used directly from browser via WebSocket)
2. **ANTHROPIC_API_KEY** - For Claude-based natural language parsing (used in Edge Function)

---

## Files to Create

### 1. Edge Function: `supabase/functions/parse-voice-reminder/index.ts`

**Purpose**: Receives a transcript and returns structured reminder data using Claude's tool_use feature.

**Key behaviors**:
- Classifies input as `quick`, `medication`, `unrelated`, or `unclear`
- Extracts recipient name, phone number, schedule, and medications
- Uses Claude claude-sonnet-4-20250514 with tool_use for reliable JSON output
- Handles natural language time parsing ("2pm" → "14:00", "morning" → "09:00")
- Handles relative dates ("tomorrow", "next Monday")
- For multi-time inputs, extracts FIRST time slot only and counts additional slots
- Returns confidence score and clarification notes

**Response structure**:
```typescript
{
  success: boolean;
  data: {
    reminder_type: "quick" | "medication" | "unrelated" | "unclear";
    recipient_name: string | null;
    phone_number: string | null;
    message: string | null;  // For quick reminders
    medications: Array<{...}> | null;  // For medication reminders
    schedule: { start_date, time, frequency, ... } | null;
    confidence_score: number;
    clarification_needed: string[];
    rejection_reason?: string;
    additional_time_slots_count: number;
  };
  raw_transcript: string;
}
```

### 2. Hook: `src/hooks/useVoiceRecorder.ts`

**Purpose**: Audio recording with Deepgram real-time transcription via WebSocket.

**Features**:
- 1-minute maximum recording with countdown timer
- Real-time transcript updates (interim + final)
- Progress tracking (0-1) for UI progress bar
- Auto-stop when time limit reached
- Microphone permission handling
- WebSocket connection to Deepgram with Nova-2 model

**Interface**:
```typescript
{
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  remainingSeconds: number;
  elapsedSeconds: number;
  progress: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  error: Error | null;
}
```

### 3. Hook: `src/hooks/useVoiceReminderParser.ts`

**Purpose**: React Query mutation wrapper for the parse-voice-reminder edge function.

**Features**:
- Calls edge function with transcript, timezone, and user's contacts
- Returns typed ParsedVoiceReminder data
- Handles errors gracefully

### 4. Hook: `src/hooks/useVoiceDisableStatus.ts`

**Purpose**: Manage 24-hour disable state after 2 consecutive failures.

**Features**:
- Persists disable timestamp in localStorage
- Provides remaining time in human-readable format ("23h 45m")
- Auto-clears after 24 hours
- Exposes `disableVoiceFor24Hours()` and `checkAndClearIfExpired()`

### 5. Component: `src/components/reminders/VoiceInputSection.tsx`

**Purpose**: Collapsible accordion UI for voice input at top of reminder forms.

**States**:
- **Idle**: Microphone button with "Tap to start speaking" + examples
- **Recording**: Timer countdown, progress bar, live transcript, stop button
- **Processing**: Spinner with "Understanding your request..."
- **Success**: Collapsed accordion showing "✓ Form filled from voice"
- **Warning**: First failure with retry option
- **Disabled**: 24-hour lockout with remaining time shown

**UI elements**:
- Uses existing `Accordion` component from shadcn/ui
- Progress bar changes color: primary → amber (20s) → red (10s)
- Live transcript display during recording

---

## Files to Modify

### 1. `src/components/reminders/CreateReminderDialog.tsx`

**Changes**:
- Add VoiceInputSection between template picker and form
- Add "or fill manually" divider below voice section
- Add session failure count state (resets when dialog opens)
- Integrate useVoiceDisableStatus hook
- Add voice form fill handler that populates quick reminder fields
- Add type switch handler (if voice detects medication when in quick template)
- Show type switch banner when template is auto-switched

### 2. `src/components/reminders/MedicationReminderForm.tsx`

**Changes**:
- Add new props for voice integration (voiceData, callbacks)
- Add effect to populate form when voiceData is provided
- Add VoiceInputSection at top of form
- Add "or fill manually" divider
- Connect voice callbacks to parent dialog

### 3. `supabase/config.toml`

**Changes**:
- Add `[functions.parse-voice-reminder]` with `verify_jwt = false`

---

## Implementation Sequence

### Phase 1: Setup & Secrets
1. Prompt you to add DEEPGRAM_API_KEY and ANTHROPIC_API_KEY secrets
2. Update supabase/config.toml with new function config

### Phase 2: Edge Function
3. Create parse-voice-reminder edge function with Claude integration

### Phase 3: Hooks
4. Create useVoiceRecorder hook with Deepgram WebSocket
5. Create useVoiceReminderParser hook
6. Create useVoiceDisableStatus hook

### Phase 4: Component
7. Create VoiceInputSection component

### Phase 5: Integration
8. Modify CreateReminderDialog to add voice input for quick reminders
9. Modify MedicationReminderForm to add voice input and form population

### Phase 6: Testing
10. Deploy and test edge function
11. Test full flow end-to-end

---

## Error Handling Matrix

| Scenario | First Occurrence | Second Occurrence |
|----------|-----------------|-------------------|
| Unrelated input | Warning + retry option | 24-hour disable |
| Unclear input | Warning + helpful message | 24-hour disable |
| Type mismatch | Auto-switch template | N/A (success) |
| Multiple time slots | Fill first slot + toast | N/A (success) |
| No microphone | Browser permission dialog | Same |
| Network error | Toast (no count toward disable) | Same |

---

## Technical Notes

### Deepgram Integration
- WebSocket URL: `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=true`
- API key sent in Authorization header
- Audio format: webm/opus at 16kHz

### Claude Integration
- Uses tool_use for structured JSON output
- System prompt handles time parsing, medication detection, and instruction mapping
- Preserves exact medication names as spoken (no spell correction)

### Form Population Logic
- Form is cleared before voice data fills it
- Phone number lookup from contacts if name matches
- Schedule maps to existing FrequencyConfig structure
- Medications map to existing MedicationEntry structure

---

## Cost Estimate (per voice input)

| Service | Cost |
|---------|------|
| Deepgram Nova-2 (≤60s) | ~$0.004 |
| Claude Sonnet | ~$0.003 |
| **Total** | **~$0.007** |

