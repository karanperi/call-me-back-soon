
# Fix: Call History Not Recording Failed Calls

## Root Cause

The `call_history` table has a database constraint that only allows these status values:
- `completed`, `missed`, `voicemail`, `failed`

However, the `make-call` edge function attempts to insert records with status **`pending`** and **`in_progress`**, which are **not allowed** by this constraint.

**Result:** The initial insert fails silently, so when the call subsequently fails, there's no history record to update - hence failed calls are not appearing in the History screen.

---

## Solution

Update the database constraint to include the two missing status values: `pending` and `in_progress`.

---

## Technical Changes

### Database Migration

Drop the existing check constraint and recreate it with the additional status values:

```sql
-- Drop the existing constraint
ALTER TABLE call_history DROP CONSTRAINT IF EXISTS call_history_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE call_history ADD CONSTRAINT call_history_status_check 
CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'missed', 'voicemail', 'failed']));
```

---

## Status Flow After Fix

```text
[pending] --> [in_progress] --> [completed] (success)
                           \--> [failed] (error)
                           \--> [missed] (no answer)
                           \--> [voicemail]
```

---

## Why This Was Missed

The edge function was updated to use a "create first, update later" pattern with `pending` status, but the database constraint wasn't updated to allow these new status values.

---

## Testing

After the fix:
1. Create a reminder with an invalid phone number
2. Wait for the scheduled time
3. Check History > Failed tab - the failed call should now appear with the error message
