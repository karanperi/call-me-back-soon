import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

/**
 * Validates that the request actually comes from Twilio by verifying
 * the X-Twilio-Signature header using HMAC-SHA1.
 * 
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Sort the POST parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();
  
  // Concatenate the URL and sorted key-value pairs
  const data = url + sortedKeys.map(key => key + params[key]).join("");
  
  // Import key for HMAC-SHA1
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  // Compute HMAC-SHA1
  const messageData = encoder.encode(data);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const expectedSignature = encodeBase64(signatureBuffer);
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    // Get Twilio Auth Token for signature validation
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not configured");
      return new Response("Server Configuration Error", { status: 500 });
    }

    // Validate Twilio signature
    const twilioSignature = req.headers.get("X-Twilio-Signature");
    if (!twilioSignature) {
      console.error("Missing X-Twilio-Signature header - rejecting request");
      return new Response("Unauthorized", { status: 401 });
    }

    // Clone the request to read form data (we need to read it twice: for validation and processing)
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // IMPORTANT: req.url returns the internal URL, but Twilio signed using the public URL.
    // We must reconstruct the public URL that Twilio actually called.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publicUrl = `${supabaseUrl}/functions/v1/twilio-status-callback`;
    
    console.log("Validating Twilio signature");

    // Validate the signature using the public URL
    const isValid = await validateTwilioSignature(authToken, twilioSignature, publicUrl, params);
    if (!isValid) {
      console.error("Invalid Twilio signature - rejecting request");
      console.error("Invalid Twilio signature - rejecting request");
      return new Response("Unauthorized", { status: 401 });
    }

    // Extract callback data
    const callSid = params["CallSid"];
    const callStatus = params["CallStatus"];
    const answeredBy = params["AnsweredBy"] || null;
    const callDuration = params["CallDuration"] || null;

    console.log(`Callback received: Status=${callStatus}, Duration=${callDuration}`);

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
      console.warn("No matching call history found for callback");
    } else {
      console.log(`Updated call history to status: ${ourStatus}`);
    }

    // Twilio expects 200 OK
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Callback error:", error);
    // Return 200 to prevent Twilio retries on our errors
    return new Response("OK", { status: 200 });
  }
});
