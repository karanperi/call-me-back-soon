import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper functions for date manipulation
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function getDay(date: Date): number {
  return date.getDay();
}

function setDay(date: Date, day: number): Date {
  const result = new Date(date);
  const currentDay = result.getDay();
  const diff = day - currentDay;
  result.setDate(result.getDate() + diff);
  return result;
}

// Calculate next occurrence based on recurrence rules
function calculateNextSchedule(reminder: any): Date | null {
  const current = new Date(reminder.scheduled_at);
  const interval = reminder.recurrence_interval || 1;
  const frequency = reminder.frequency;
  const daysOfWeek = reminder.recurrence_days_of_week;

  switch (frequency) {
    case "once":
      return null; // One-time reminders don't recur

    case "daily":
      return addDays(current, interval);

    case "weekly":
      return addWeeks(current, interval);

    case "monthly": {
      // For monthly, handle both day-of-month and week-of-month
      const weekOfMonth = reminder.recurrence_week_of_month;
      if (weekOfMonth !== null && weekOfMonth !== undefined) {
        // Week of month style (e.g., "first Monday")
        let nextMonth = addMonths(current, interval);
        const dayOfWeekForMonthly = reminder.recurrence_day_of_week || getDay(current);
        
        // Find the nth weekday of the month
        const year = nextMonth.getFullYear();
        const month = nextMonth.getMonth();
        
        if (weekOfMonth === -1) {
          // Last occurrence of the weekday
          const lastDay = new Date(year, month + 1, 0);
          let targetDate = lastDay;
          while (getDay(targetDate) !== dayOfWeekForMonthly) {
            targetDate = addDays(targetDate, -1);
          }
          nextMonth.setDate(targetDate.getDate());
        } else {
          // First/second/third/fourth occurrence
          const firstOfMonth = new Date(year, month, 1);
          let count = 0;
          let targetDate = firstOfMonth;
          while (count < weekOfMonth) {
            if (getDay(targetDate) === dayOfWeekForMonthly) {
              count++;
              if (count === weekOfMonth) break;
            }
            targetDate = addDays(targetDate, 1);
          }
          nextMonth.setDate(targetDate.getDate());
        }
        
        // Preserve time from original
        nextMonth.setHours(current.getHours(), current.getMinutes(), current.getSeconds());
        return nextMonth;
      } else {
        // Day of month style (e.g., "15th of each month")
        return addMonths(current, interval);
      }
    }

    case "yearly":
      return addYears(current, interval);

    case "weekdays": {
      // Find next weekday (Mon-Fri)
      let next = addDays(current, 1);
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      return next;
    }

    case "weekends": {
      // Find next weekend day (Sat-Sun)
      let next = addDays(current, 1);
      while (getDay(next) !== 0 && getDay(next) !== 6) {
        next = addDays(next, 1);
      }
      return next;
    }

    case "custom": {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find the next day in the selected days
        const currentDayOfWeek = getDay(current);
        const sortedDays = [...daysOfWeek].sort((a: number, b: number) => a - b);
        
        // Find next day this week
        const nextDayThisWeek = sortedDays.find((d: number) => d > currentDayOfWeek);
        
        if (nextDayThisWeek !== undefined) {
          return setDay(current, nextDayThisWeek);
        } else {
          // Move to next interval and get the first day
          const nextWeek = addWeeks(current, interval);
          return setDay(nextWeek, sortedDays[0]);
        }
      }
      // Fallback to daily with interval
      return addDays(current, interval);
    }

    default:
      return null;
  }
}

// Check if reminder should continue based on end conditions
function shouldContinue(reminder: any, nextScheduledAt: Date): boolean {
  // Check max occurrences
  const maxOccurrences = reminder.max_occurrences;
  if (maxOccurrences !== null && maxOccurrences !== undefined) {
    if (reminder.repeat_count >= maxOccurrences) {
      return false;
    }
  }

  // Check repeat_until date
  const repeatUntil = reminder.repeat_until ? new Date(reminder.repeat_until) : null;
  if (repeatUntil && nextScheduledAt > repeatUntil) {
    return false;
  }

  // Default max of 30 occurrences as safety limit
  if (reminder.repeat_count >= 30 && !maxOccurrences) {
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET");

    // Authenticate the request - must be a service role call or have valid cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecretHeader = req.headers.get("X-Cron-Secret");
    
    // Check if this is a valid service role call
    const isServiceRoleCall = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    
    // Check if this is a valid cron job call (if CRON_SECRET is configured)
    const isValidCronCall = CRON_SECRET && cronSecretHeader === CRON_SECRET;
    
    if (!isServiceRoleCall && !isValidCronCall) {
      console.error("Unauthorized access attempt to check-reminders");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get current time and a 2-minute window
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    console.log(`Checking for reminders due between ${twoMinutesAgo.toISOString()} and ${now.toISOString()}`);

    // Find reminders that are due and active
    const { data: dueReminders, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_active", true)
      .gte("scheduled_at", twoMinutesAgo.toISOString())
      .lte("scheduled_at", now.toISOString());

    if (error) {
      console.error("Database query error:", error);
      throw new Error("reminder_query_failed");
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    // Process each due reminder
    const results = [];
    for (const reminder of dueReminders || []) {
      try {
        // Call the make-call function with service role auth
        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            reminderId: reminder.id,
            recipientName: reminder.recipient_name,
            phoneNumber: reminder.phone_number,
            message: reminder.message,
            voice: reminder.voice,
            customVoiceId: reminder.custom_voice_id,
            userId: reminder.user_id,
          }),
        });

        const result = await response.json();
        results.push({ reminderId: reminder.id, success: response.ok });

        // Handle recurring reminders
        if (reminder.frequency !== "once") {
          const nextScheduledAt = calculateNextSchedule(reminder);
          
          if (nextScheduledAt && shouldContinue(reminder, nextScheduledAt)) {
            await supabase
              .from("reminders")
              .update({
                scheduled_at: nextScheduledAt.toISOString(),
                repeat_count: reminder.repeat_count + 1,
              })
              .eq("id", reminder.id);
            
            console.log(`Rescheduled reminder ${reminder.id} to ${nextScheduledAt.toISOString()}`);
          } else {
            // Deactivate the reminder if it shouldn't continue
            await supabase
              .from("reminders")
              .update({ is_active: false })
              .eq("id", reminder.id);
            
            console.log(`Deactivated reminder ${reminder.id} - recurrence ended`);
          }
        } else {
          // One-time reminder - deactivate after execution
          await supabase
            .from("reminders")
            .update({ is_active: false })
            .eq("id", reminder.id);
        }

      } catch (callError: unknown) {
        console.error(`Error processing reminder ${reminder.id}:`, callError);
        results.push({ reminderId: reminder.id, success: false });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in check-reminders function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
