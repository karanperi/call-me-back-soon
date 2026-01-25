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
      friendly_female: "21m00Tcm4TlvDq8ikWAM", // Rachel
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
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`);
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
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL for the audio file
    const { data: publicUrlData } = supabase.storage
      .from("call-audio")
      .getPublicUrl(audioFileName);

    const audioUrl = publicUrlData.publicUrl;
    console.log(`Audio uploaded: ${audioUrl}`);

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
      console.error("Twilio API error:", twilioResult);
      throw new Error(`Twilio API error: ${twilioResult.message || twilioResponse.status}`);
    }

    console.log(`Call initiated. Twilio SID: ${twilioResult.sid}`);

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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in make-call function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
