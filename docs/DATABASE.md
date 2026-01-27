# Yaad Database Schema

This document describes the PostgreSQL database schema used by Yaad via Supabase.

## Overview

Yaad uses four main tables:
- `profiles` - User preferences
- `reminders` - Scheduled reminders
- `call_history` - Call logs
- `user_voices` - Custom voice clones

All tables have Row Level Security (RLS) enabled.

---

## Tables

### profiles

Extends Supabase auth.users with application-specific data.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    default_voice TEXT DEFAULT 'friendly_female' 
        CHECK (default_voice IN ('friendly_female', 'friendly_male')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| email | TEXT | User's email (denormalized) |
| default_voice | TEXT | Default voice preference |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time (auto-updated) |

**Auto-creation**: Profile is created automatically on user signup via trigger.

---

### reminders

Stores scheduled reminder calls.

```sql
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    voice TEXT NOT NULL DEFAULT 'friendly_female' 
        CHECK (voice IN ('friendly_female', 'friendly_male', 'custom')),
    custom_voice_id UUID REFERENCES public.user_voices(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'once' 
        CHECK (frequency IN ('once', 'daily', 'weekly')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    repeat_count INTEGER NOT NULL DEFAULT 0,
    repeat_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner, references auth.users |
| recipient_name | TEXT | Name of call recipient |
| phone_number | TEXT | E.164 format (+1234567890) |
| message | TEXT | Message to deliver (max 500 chars) |
| voice | TEXT | Voice to use |
| custom_voice_id | UUID | Reference to user's custom voice |
| scheduled_at | TIMESTAMPTZ | When to make the call |
| frequency | TEXT | once, daily, or weekly |
| is_active | BOOLEAN | Whether reminder is enabled |
| repeat_count | INTEGER | Number of times repeated |
| repeat_until | TIMESTAMPTZ | End date for recurring |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

---

### call_history

Logs all call attempts and their outcomes.

```sql
CREATE TABLE public.call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    voice TEXT NOT NULL,
    status TEXT NOT NULL 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'missed', 'voicemail', 'failed')),
    twilio_call_sid TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_seconds INTEGER,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reminder_id | UUID | Source reminder (nullable) |
| user_id | UUID | Owner |
| recipient_name | TEXT | Denormalized from reminder |
| phone_number | TEXT | Denormalized from reminder |
| message | TEXT | Actual message sent |
| voice | TEXT | Voice used |
| status | TEXT | Call outcome |
| twilio_call_sid | TEXT | Twilio's call identifier |
| attempted_at | TIMESTAMPTZ | When call was attempted |
| duration_seconds | INTEGER | Call duration |
| error_message | TEXT | Error details if failed |
| attempts | INTEGER | Number of retry attempts |
| created_at | TIMESTAMPTZ | Record creation time |

**Status Values**:
- `pending` - Call record created, not yet processed
- `in_progress` - Call initiated, waiting for completion
- `completed` - Call answered by human
- `missed` - No answer or busy
- `voicemail` - Answered by machine/voicemail
- `failed` - Technical failure

---

### user_voices

Stores custom voice clones created by users.

```sql
CREATE TABLE public.user_voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    elevenlabs_voice_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' 
        CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| name | TEXT | User-provided name for voice |
| elevenlabs_voice_id | TEXT | ElevenLabs voice identifier |
| status | TEXT | processing, ready, or failed |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

---

## Row Level Security (RLS)

All tables have RLS enabled. Policies ensure users can only access their own data.

### Example Policies (reminders)

```sql
-- Users can view their own reminders
CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own reminders
CREATE POLICY "Users can create their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);
```

---

## Triggers

### updated_at Auto-Update

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: profiles, reminders, user_voices
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Auto-Create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Indexes

Recommended indexes for performance:

```sql
-- Reminders: Find due reminders
CREATE INDEX idx_reminders_scheduled_active 
ON public.reminders(scheduled_at, is_active) 
WHERE is_active = true;

-- Call history: User's recent calls
CREATE INDEX idx_call_history_user_date 
ON public.call_history(user_id, attempted_at DESC);

-- Call history: Find by Twilio SID (for callbacks)
CREATE INDEX idx_call_history_twilio_sid 
ON public.call_history(twilio_call_sid) 
WHERE twilio_call_sid IS NOT NULL;
```

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│ auth.users  │       │  profiles   │
├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ id (PK,FK)  │
│ email       │       │ email       │
│ ...         │       │ default_voice│
└─────────────┘       └─────────────┘
      │
      │ user_id
      ▼
┌─────────────┐       ┌─────────────┐
│  reminders  │       │ user_voices │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ user_id (FK)│       │ user_id (FK)│
│ recipient   │◄──────│ name        │
│ phone       │  FK   │ elevenlabs_id│
│ message     │       │ status      │
│ voice       │       └─────────────┘
│ custom_voice_id (FK)│
│ scheduled_at│
│ frequency   │
└─────────────┘
      │
      │ reminder_id
      ▼
┌─────────────┐
│call_history │
├─────────────┤
│ id (PK)     │
│ reminder_id │
│ user_id (FK)│
│ status      │
│ twilio_sid  │
│ duration    │
└─────────────┘
```

---

## Migrations

Migration files are located in `supabase/migrations/`. Apply them in chronological order.
