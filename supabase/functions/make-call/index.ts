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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ReminderPayload = await req.json();
    const { reminderId, recipientName, phoneNumber, message, voice, userId } = payload;

    // Validate required fields
    if (!reminderId || !recipientName || !phoneNumber || !message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ELEVENLABS_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
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