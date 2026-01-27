import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContacts } from './useContacts';
import { getDefaultTimezone } from '@/lib/timezones';

export interface ParsedVoiceReminder {
  reminder_type: "quick" | "medication" | "unrelated" | "unclear";
  recipient_name: string | null;
  phone_number: string | null;
  message: string | null;
  medications: Array<{
    name: string;
    quantity: number;
    unit: "tablet" | "capsule" | "ml" | "drops" | "puff" | "unit";
    instruction: "none" | "with_food" | "with_water" | "before_meal" | 
                 "after_meal" | "empty_stomach" | "before_bed";
  }> | null;
  schedule: {
    start_date: string;
    time: string;
    frequency: "once" | "daily" | "weekly";
    recurrence_days_of_week?: number[];
    repeat_until?: string;
    max_occurrences?: number;
  } | null;
  confidence_score: number;
  clarification_needed: string[];
  rejection_reason?: string;
  additional_time_slots_count: number;
}

export interface ParseVoiceReminderResult {
  success: boolean;
  data: ParsedVoiceReminder;
  raw_transcript: string;
}

export function useVoiceReminderParser() {
  const { data: contacts } = useContacts();
  
  return useMutation({
    mutationFn: async (transcript: string): Promise<ParseVoiceReminderResult> => {
      const { data, error } = await supabase.functions.invoke('parse-voice-reminder', {
        body: {
          transcript,
          timezone: getDefaultTimezone(),
          existingContacts: contacts?.map(c => ({
            name: c.name,
            phone_number: c.phone_number
          }))
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to parse voice input');

      return data as ParseVoiceReminderResult;
    },
  });
}
