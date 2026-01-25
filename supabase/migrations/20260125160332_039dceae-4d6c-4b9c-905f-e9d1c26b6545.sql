-- Add new recurrence columns to reminders table
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_days_of_week integer[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_day_of_month integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_week_of_month integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_occurrences integer DEFAULT NULL;