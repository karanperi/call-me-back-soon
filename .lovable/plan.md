
# Fix: Detect Actual Call Outcome (Answered/Missed/Voicemail)

## Problem Identified

The `make-call` edge function marks calls as `completed` immediately when Twilio **accepts** the API request (returns a Call SID). At this point, the call hasn't even started ringing yet.

**Current Flow:**
```
API Request → Twilio accepts → Status: "completed" ❌
                                 (call hasn't even rung yet!)
```

**Actual Call Outcome (unknown to our system):**
- Recipient answered → Should be "completed"
- Recipient didn't answer → Should be "missed"  
- Call went to voicemail → Should be "voicemail"

This is why the call shows as "completed" even though it actually went to voicemail.

---

## Solution: Use Twilio Status Callbacks

Twilio can send webhooks to notify us of the actual call outcome. We need to:

1. Create a new edge function to receive Twilio status callbacks
2. Update the `make-call` function to request status callbacks
3. Keep the initial status as `in_progress` until we receive the final status

---

## Technical Changes

### 1. Create New Edge Function: `twilio-status-callback`

This function receives webhooks from Twilio with the actual call outcome.

**File:** `supabase/functions/twilio-status-callback/index.ts`

Twilio sends these `CallStatus` values:
| Twilio Status | Our Status | Meaning |
|---------------|------------|---------|
| `completed` | `completed` | Call was answered |
| `busy` | `missed` | Recipient busy |
| `no-answer` | `missed` | No answer |
| `failed` | `failed` | Call failed |
| `canceled` | `failed` | Call was canceled |

For voicemail detection, we check if the call was answered by a machine using `AnsweredBy` parameter (requires AMD - Answering Machine Detection).

### 2. Update `make-call` Edge Function

Add `StatusCallback` parameter to the Twilio API call:

```typescript
const twilioParams = new URLSearchParams({
  To: phoneNumber,
  From: TWILIO_PHONE_NUMBER,
  Twiml: twiml.trim(),
  StatusCallback: `${SUPABASE_URL}/functions/v1/twilio-status-callback`,
  StatusCallbackEvent: "completed",  // Only notify on final status
  // Optional: Enable answering machine detection
  // MachineDetection: "Enable",
});
```

**Important:** Keep status as `in_progress` instead of immediately setting to `completed`:

```typescript
// Remove this line:
// await updateHistoryStatus("completed");

// The status will be updated by the callback
console.log(`Call initiated. Call SID: ${twilioResult.sid}`);
// Status remains "in_progress" until callback updates it
```

### 3. Store Twilio Call SID

Add `twilio_call_sid` column to `call_history` table to link callbacks to history records.

---

## Database Migration

```sql
-- Add column to store Twilio Call SID for linking callbacks
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_history_twilio_sid ON call_history(twilio_call_sid);
```

---

## New Edge Function: `twilio-status-callback`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const answeredBy = formData.get("AnsweredBy") as string | null;

    console.log(`Callback received: SID=${callSid}, Status=${callStatus}, AnsweredBy=${answeredBy}`);

    // Map Twilio status to our status
    let ourStatus: string;
    if (callStatus === "completed") {
      // Check if answered by machine (voicemail)
      if (answeredBy === "machine_start" || answeredBy === "machine_end_beep") {
        ourStatus = "voicemail";
      } else {
        ourStatus = "completed";
      }
    } else if (callStatus === "busy" || callStatus === "no-answer") {
      ourStatus = "missed";
    } else if (callStatus === "failed" || callStatus === "canceled") {
      ourStatus = "failed";
    } else {
      // Intermediate status, ignore
      return new Response("OK", { status: 200 });
    }

    // Update call history
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("call_history")
      .update({ status: ourStatus })
      .eq("twilio_call_sid", callSid);

    if (error) {
      console.error("Failed to update call history:", error);
    }

    // Twilio expects 200 OK
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response("Error", { status: 500 });
  }
});
```

---

## Updated make-call Flow

```
1. Create history record (status: "pending")
2. Generate audio
3. Upload audio
4. Update status to "in_progress"
5. Call Twilio API with StatusCallback URL
6. Store twilio_call_sid in history
7. Return success (status remains "in_progress")
   
...later...

8. Twilio webhook arrives with actual outcome
9. twilio-status-callback updates status to completed/missed/voicemail/failed
```

---

## Important Considerations

### Voicemail Detection (AMD)

Twilio's Answering Machine Detection is a paid feature. Without it, we cannot distinguish between:
- Human answered
- Voicemail answered

If AMD is not enabled, we can only detect:
- Call connected (`completed`)
- Call not connected (`busy`, `no-answer`, `failed`)

### Fallback Timeout

If Twilio callback never arrives (network issues), calls will stay as `in_progress` forever. Consider adding a background job to mark old `in_progress` calls as `missed` after a timeout (e.g., 5 minutes).

---

## Summary of Changes

| File | Change |
|------|--------|
| Database | Add `twilio_call_sid` column |
| `supabase/functions/make-call/index.ts` | Add StatusCallback, store Call SID, don't immediately mark completed |
| `supabase/functions/twilio-status-callback/index.ts` | New function to receive Twilio webhooks |

---

## Testing

After implementation:
1. Make a call and let it ring without answering → Should show as "missed"
2. Make a call and answer → Should show as "completed"
3. Make a call and let it go to voicemail → Should show as "voicemail" (if AMD enabled)
