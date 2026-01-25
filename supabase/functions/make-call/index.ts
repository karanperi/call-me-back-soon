import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderPayload {
  reminderId: string;
  recipientName: string;
  phoneNumber: string;
  message: string;
  voice: "friendly_female" | "friendly_male";
  userId: string;
  isServiceCall?: boolean; // Flag for internal service-to-service calls
}

// Input validation constants
const VALID_VOICES = ["friendly_female", "friendly_male"];
const UK_PHONE_REGEX = /^\+447\d{9}$/;
const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;
const MAX_RECIPIENT_NAME_LENGTH = 100;
const MIN_RECIPIENT_NAME_LENGTH = 2;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!ELEVENLABS_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Check if this is a service role call (from check-reminders function)
    const isServiceRoleCall = token === SUPABASE_SERVICE_ROLE_KEY;
    
    let authenticatedUserId: string | null = null;
    
    if (isServiceRoleCall) {
      // Service role calls are trusted (internal function-to-function calls)
      console.log("Service role call detected - skipping user authentication");
    } else {
      // Regular user call - validate the JWT using getClaims
      const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.error("Auth claims error:", claimsError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      authenticatedUserId = claimsData.claims.sub as string;
    }

    const payload: ReminderPayload = await req.json();
    const { reminderId, recipientName, phoneNumber, message, voice, userId } = payload;

    // Validate required fields
    if (!reminderId || !recipientName || !phoneNumber || !message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-service calls, verify the userId matches the authenticated user
    if (!isServiceRoleCall && authenticatedUserId !== userId) {
      console.error("User ID mismatch - possible spoofing attempt");
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Phone number format (UK)
    if (!UK_PHONE_REGEX.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid UK phone number format. Expected: +447XXXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Message length
    if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message must be ${MIN_MESSAGE_LENGTH}-${MAX_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Voice parameter
    if (!VALID_VOICES.includes(voice)) {
      return new Response(
        JSON.stringify({ error: "Invalid voice selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Recipient name length
    if (recipientName.length < MIN_RECIPIENT_NAME_LENGTH || recipientName.length > MAX_RECIPIENT_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Recipient name must be ${MIN_RECIPIENT_NAME_LENGTH}-${MAX_RECIPIENT_NAME_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Map voice selection to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      friendly_female: "caMurMrvWp0v3NFJALhl", // Custom female voice
      friendly_male: "VR6AewLTigWG4xSOukaG",   // Josh
    };

    const voiceId = voiceMap[voice] || voiceMap.friendly_female;

    // Personalize the message with recipient's name
    const personalizedMessage = `Hello ${recipientName}. ${message}`;

    console.log(`Generating speech for reminder ${reminderId}...`);

    // Step 1: Generate speech with ElevenLabs
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: personalizedMessage,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error("Speech generation error:", errorText);
      throw new Error("speech_generation_failed");
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    console.log(`Speech generated. Audio size: ${audioBuffer.byteLength} bytes`);

    // Step 2: Upload audio to Supabase Storage for Twilio to access
    const audioFileName = `${userId}/reminder-${reminderId}-${Date.now()}.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from("call-audio")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("audio_upload_failed");
    }

    // Create a signed URL with 1 hour expiration for Twilio to access the audio
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("call-audio")
      .createSignedUrl(audioFileName, 3600); // 1 hour expiration

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      throw new Error("audio_url_generation_failed");
    }

    const audioUrl = signedUrlData.signedUrl;
    console.log(`Audio uploaded with signed URL`);

    // Step 3: Make the call with Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    // TwiML instructions for the call
    const twiml = `
      <Response>
        <Play>${audioUrl}</Play>
        <Pause length="1"/>
        <Say voice="alice">Goodbye.</Say>
      </Response>
    `;

    const twilioParams = new URLSearchParams({
      To: phoneNumber,
      From: TWILIO_PHONE_NUMBER,
      Twiml: twiml.trim(),
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
      body: twilioParams.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Call delivery error:", twilioResult);
      throw new Error("call_delivery_failed");
    }

    console.log(`Call initiated. Call SID: ${twilioResult.sid}`);

    // Step 4: Create call history record with service role (bypasses RLS)
    const { error: historyError } = await supabase.from("call_history").insert({
      reminder_id: reminderId,
      user_id: userId,
      recipient_name: recipientName,
      phone_number: phoneNumber,
      message: personalizedMessage,
      voice: voice,
      status: "completed",
      attempted_at: new Date().toISOString(),
    });

    if (historyError) {
      console.error("Error creating call history:", historyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        callSid: twilioResult.sid,
        message: "Call initiated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorCode = error instanceof Error ? error.message : "internal_error";
    console.error("Error in make-call function:", error);
    
    // Return generic error messages to clients
    const clientMessage = getClientErrorMessage(errorCode);
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Map internal error codes to safe client-facing messages
function getClientErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    "speech_generation_failed": "Failed to generate audio for your call",
    "audio_upload_failed": "Failed to prepare audio for your call",
    "audio_url_generation_failed": "Failed to prepare audio for your call",
    "call_delivery_failed": "Failed to initiate the call",
    "internal_error": "An unexpected error occurred",
  };
  
  return errorMessages[errorCode] || "An unexpected error occurred";
}