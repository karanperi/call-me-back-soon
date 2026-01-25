

# Fix Plan: Cron Job Authentication for check-reminders

## Problem Identified

The scheduled reminder processing is failing because the cron job is using the wrong authentication token. After the recent security hardening, the `check-reminders` edge function rejects requests that don't have proper service-level authentication.

**Root Cause:** The cron job is sending the **anon key** (public key) but the function now requires:
- The service role key in Authorization header, OR  
- A valid CRON_SECRET in the X-Cron-Secret header

## Solution Overview

Update the cron job to use proper authentication by adding a CRON_SECRET header.

## Implementation Steps

### Step 1: Add CRON_SECRET to Backend Secrets

A new secret `CRON_SECRET` will be added. The system will prompt you to enter a secure random value (e.g., a long random string like a UUID or password).

### Step 2: Update the Cron Job

Replace the existing cron job with one that includes the CRON_SECRET header:

```sql
-- Delete the old cron job
SELECT cron.unschedule('check-due-reminders');

-- Create new cron job with proper authentication
SELECT cron.schedule(
  'check-due-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://csenulbdattrynafibqw.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Note:** Since Postgres cannot directly access Deno environment variables, we'll use the service role key approach instead (which the function already supports).

### Step 3: Alternative - Use Service Role Key

The simpler fix is to update the cron job to use the service role key:

```sql
-- Delete the old cron job
SELECT cron.unschedule('check-due-reminders');

-- Create new cron job with service role authentication
SELECT cron.schedule(
  'check-due-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://csenulbdattrynafibqw.supabase.co/functions/v1/check-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY_HERE"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

This requires obtaining and inserting the service role key into the cron job definition.

## Files to Modify

1. **Database migration** - Update the cron job with correct authentication headers

## Expected Outcome

After implementation:
- The cron job will successfully authenticate with the `check-reminders` function
- Scheduled reminders will be processed as expected
- Calls will be initiated via Twilio when reminders are due

---

## Technical Details

| Component | Current State | Required State |
|-----------|--------------|----------------|
| Cron Authorization | Anon key | Service role key |
| Edge Function Auth | Validates service role OR CRON_SECRET | No change needed |
| CRON_SECRET | Not configured | Optional (service role is sufficient) |

