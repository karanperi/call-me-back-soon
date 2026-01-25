import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            userId: reminder.user_id,
          }),
        });

        const result = await response.json();
        results.push({ reminderId: reminder.id, success: response.ok });

        // Handle recurring reminders
        if (reminder.frequency !== "once" && reminder.repeat_count < 30) {
          let nextScheduledAt = new Date(reminder.scheduled_at);
          if (reminder.frequency === "daily") {
            nextScheduledAt.setDate(nextScheduledAt.getDate() + 1);
          } else if (reminder.frequency === "weekly") {
            nextScheduledAt.setDate(nextScheduledAt.getDate() + 7);
          }

          const repeatUntil = reminder.repeat_until ? new Date(reminder.repeat_until) : null;
          if (!repeatUntil || nextScheduledAt <= repeatUntil) {
            await supabase
              .from("reminders")
              .update({
                scheduled_at: nextScheduledAt.toISOString(),
                repeat_count: reminder.repeat_count + 1,
              })
              .eq("id", reminder.id);
          } else {
            await supabase
              .from("reminders")
              .update({ is_active: false })
              .eq("id", reminder.id);
          }
        } else if (reminder.frequency === "once") {
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