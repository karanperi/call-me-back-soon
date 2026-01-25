import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const answeredBy = formData.get("AnsweredBy") as string | null;
    const callDuration = formData.get("CallDuration") as string | null;

    console.log(`Callback received: SID=${callSid}, Status=${callStatus}, AnsweredBy=${answeredBy}, Duration=${callDuration}`);

    if (!callSid || !callStatus) {
      console.error("Missing required fields: CallSid or CallStatus");
      return new Response("Bad Request", { status: 400 });
    }

    // Map Twilio status to our status
    let ourStatus: string;
    if (callStatus === "completed") {
      // Check if answered by machine (voicemail)
      // AMD returns: machine_start, machine_end_beep, machine_end_silence, machine_end_other, human, fax, unknown
      if (answeredBy === "machine_start" || answeredBy === "machine_end_beep" || 
          answeredBy === "machine_end_silence" || answeredBy === "machine_end_other") {
        ourStatus = "voicemail";
      } else {
        ourStatus = "completed";
      }
    } else if (callStatus === "busy" || callStatus === "no-answer") {
      ourStatus = "missed";
    } else if (callStatus === "failed" || callStatus === "canceled") {
      ourStatus = "failed";
    } else {
      // Intermediate status (queued, ringing, in-progress), ignore
      console.log(`Ignoring intermediate status: ${callStatus}`);
      return new Response("OK", { status: 200 });
    }

    // Initialize Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build update object
    const updateData: Record<string, unknown> = { status: ourStatus };
    
    // Add duration if available
    if (callDuration) {
      const durationSeconds = parseInt(callDuration, 10);
      if (!isNaN(durationSeconds)) {
        updateData.duration_seconds = durationSeconds;
      }
    }

    // Update call history using twilio_call_sid
    const { data, error } = await supabase
      .from("call_history")
      .update(updateData)
      .eq("twilio_call_sid", callSid)
      .select("id");

    if (error) {
      console.error("Failed to update call history:", error);
      // Still return 200 to Twilio so it doesn't retry
      return new Response("OK", { status: 200 });
    }

    if (!data || data.length === 0) {
      console.warn(`No call history found for SID: ${callSid}`);
    } else {
      console.log(`Updated call history ${data[0].id} to status: ${ourStatus}`);
    }

    // Twilio expects 200 OK
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Callback error:", error);
    // Return 200 to prevent Twilio retries on our errors
    return new Response("OK", { status: 200 });
  }
});
