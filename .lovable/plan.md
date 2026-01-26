

# Fix: Update reminders_voice_check Constraint

## Problem Identified

The database has a check constraint on the `reminders.voice` column that only allows `'friendly_female'` and `'friendly_male'`. When users select their custom voice, the code sets `voice = 'custom'`, which violates this constraint.

**Current constraint:**
```sql
CHECK ((voice = ANY (ARRAY['friendly_female'::text, 'friendly_male'::text])))
```

**Error from Postgres logs:**
```
new row for relation "reminders" violates check constraint "reminders_voice_check"
```

## Solution

Run a database migration to update the `reminders_voice_check` constraint to include `'custom'` as a valid value.

## Database Migration

**SQL to execute:**
```sql
-- Drop the existing check constraint on reminders.voice
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_voice_check;

-- Add updated check constraint that includes 'custom'
ALTER TABLE public.reminders ADD CONSTRAINT reminders_voice_check 
  CHECK (voice IN ('friendly_female', 'friendly_male', 'custom'));
```

## Technical Details

- **Table affected:** `public.reminders`
- **Constraint name:** `reminders_voice_check`
- **Change:** Add `'custom'` to allowed values
- **Risk:** Low - this is an additive change that doesn't affect existing data

## No Code Changes Required

The frontend code in `CreateReminderDialog.tsx` is already correctly setting:
- `voice: 'custom'` when custom voice is selected
- `custom_voice_id: customVoiceId` to reference the user's cloned voice

The same pattern exists in `MedicationReminderForm.tsx` and `EditReminderDialog.tsx`.

Once the constraint is updated, reminder creation with custom voices will work.

