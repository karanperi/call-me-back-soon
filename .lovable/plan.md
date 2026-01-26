
# Fix: Pass customVoiceId from check-reminders to make-call

## Problem Identified

When a scheduled reminder with a custom voice is triggered by the `check-reminders` cron job, the custom voice is not used. Instead, the system falls back to the default female AI voice.

**Root cause:** The `check-reminders` edge function retrieves the reminder from the database (which includes `custom_voice_id`), but when it calls `make-call`, it does NOT include `customVoiceId` in the payload.

**Proof from database:**
- Reminder has `voice: 'custom'` and `custom_voice_id: 'f18dd662-ae35-4a19-a348-f6290148e624'`
- User voice exists with `elevenlabs_voice_id: 'VfP5fVgdSF3Qw8anrFxz'` and `status: 'ready'`

**Current code (line 232-246 of check-reminders/index.ts):**
```typescript
body: JSON.stringify({
  reminderId: reminder.id,
  recipientName: reminder.recipient_name,
  phoneNumber: reminder.phone_number,
  message: reminder.message,
  voice: reminder.voice,
  userId: reminder.user_id,
  // ❌ Missing: customVoiceId: reminder.custom_voice_id
}),
```

**In make-call, this causes the fallback (line 205-208):**
```typescript
let voiceId = voiceMap[voice] || voiceMap.friendly_female;

if (voice === "custom" && customVoiceId) {  // ❌ customVoiceId is undefined
  // This block is never executed
}
```

Since `customVoiceId` is `undefined` and `"custom"` is not in `voiceMap`, it defaults to `friendly_female`.

## Solution

Add the missing `customVoiceId` field to the payload sent from `check-reminders` to `make-call`.

## Implementation Details

**File to modify:** `supabase/functions/check-reminders/index.ts`

**Change:** Add `customVoiceId: reminder.custom_voice_id` to the request body when calling `make-call`.

```typescript
body: JSON.stringify({
  reminderId: reminder.id,
  recipientName: reminder.recipient_name,
  phoneNumber: reminder.phone_number,
  message: reminder.message,
  voice: reminder.voice,
  customVoiceId: reminder.custom_voice_id,  // ← Add this line
  userId: reminder.user_id,
}),
```

This is a one-line fix. The `make-call` function already handles `customVoiceId` correctly - it just wasn't receiving it from the cron job.
