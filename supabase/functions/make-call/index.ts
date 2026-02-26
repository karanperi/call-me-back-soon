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
  voice: "friendly_female" | "friendly_male" | "custom";
  customVoiceId?: string;
  userId: string;
  isServiceCall?: boolean;
}

// Input validation constants
const VALID_VOICES = ["friendly_female", "friendly_male", "custom"];
// E.164 format: + followed by 7-15 digits (covers all international numbers)
const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;
const MAX_RECIPIENT_NAME_LENGTH = 100;
const MIN_RECIPIENT_NAME_LENGTH = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize variables for tracking
  let callHistoryId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

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
    const isServiceRoleCall = token === SUPABASE_SERVICE_ROLE_KEY;
    
    let authenticatedUserId: string | null = null;
    
    if (isServiceRoleCall) {
      console.log("Service role call detected");
    } else {
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
    const { reminderId, recipientName, phoneNumber, message, voice, userId, customVoiceId } = payload;

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

    // Initialize Supabase client with service role for database operations
    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Personalize the message with recipient's name
    const personalizedMessage = `Hello ${recipientName}. ${message}`;

    // ============================================================
    // STEP 1: Create call history record IMMEDIATELY with "pending" status
    // ============================================================
    const { data: historyData, error: historyCreateError } = await supabase
      .from("call_history")
      .insert({
        reminder_id: reminderId,
        user_id: userId,
        recipient_name: recipientName,
        phone_number: phoneNumber,
        message: personalizedMessage,
        voice: voice,
        status: "pending",
        attempted_at: new Date().toISOString(),
      } as never)
      .select('id')
      .single();

    if (historyCreateError) {
      console.error("Error creating call history:", historyCreateError);
      // Continue anyway - don't fail the call just because history failed
    } else if (historyData) {
      callHistoryId = (historyData as { id: string }).id;
    }

    // Helper function to update history status and optionally store twilio_call_sid
    const updateHistoryStatus = async (status: string, errorMessage?: string, twilioCallSid?: string) => {
      if (callHistoryId && supabase) {
        const updateData: Record<string, unknown> = { 
          status, 
          error_message: errorMessage || null 
        };
        if (twilioCallSid) {
          updateData.twilio_call_sid = twilioCallSid;
        }
        await supabase
          .from("call_history")
          .update(updateData as never)
          .eq("id", callHistoryId);
      }
    };

    // ============================================================
    // Input validation - Phone number format (E.164 international)
    // ============================================================
    if (!E164_PHONE_REGEX.test(phoneNumber)) {
      await updateHistoryStatus("failed", "Invalid phone number format. Expected international format: +[country code][number]");
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Expected international format: +[country code][number]" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Message length
    if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      const errorMsg = `Message must be ${MIN_MESSAGE_LENGTH}-${MAX_MESSAGE_LENGTH} characters`;
      await updateHistoryStatus("failed", errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Voice parameter
    if (!VALID_VOICES.includes(voice)) {
      await updateHistoryStatus("failed", "Invalid voice selection");
      return new Response(
        JSON.stringify({ error: "Invalid voice selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation - Recipient name length
    if (recipientName.length < MIN_RECIPIENT_NAME_LENGTH || recipientName.length > MAX_RECIPIENT_NAME_LENGTH) {
      const errorMsg = `Recipient name must be ${MIN_RECIPIENT_NAME_LENGTH}-${MAX_RECIPIENT_NAME_LENGTH} characters`;
      await updateHistoryStatus("failed", errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // STEP 2: Generate speech with ElevenLabs
    // ============================================================
    const voiceMap: Record<string, string> = {
      friendly_female: "caMurMrvWp0v3NFJALhl",
      friendly_male: "VR6AewLTigWG4xSOukaG",
    };

    let voiceId = voiceMap[voice] || voiceMap.friendly_female;

    // Handle custom voice: look up the elevenlabs_voice_id from user_voices
    if (voice === "custom" && customVoiceId) {
      const { data: customVoiceData, error: customVoiceError } = await supabase
        .from("user_voices")
        .select("elevenlabs_voice_id, status")
        .eq("id", customVoiceId)
        .single();

      // Type assertion for the custom voice data
      const voiceData = customVoiceData as { elevenlabs_voice_id: string; status: string } | null;

      if (customVoiceError || !voiceData) {
        console.warn("Custom voice not found, falling back to friendly_female:", customVoiceError);
        voiceId = voiceMap.friendly_female;
      } else if (voiceData.status !== "ready") {
        console.warn("Custom voice not ready, falling back to friendly_female");
        voiceId = voiceMap.friendly_female;
      } else {
        voiceId = voiceData.elevenlabs_voice_id;
        console.log("Using custom voice");
      }
    }

    console.log("Generating speech...");

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
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
      console.error("Speech generation error:", elevenLabsResponse.status);
      await updateHistoryStatus("failed", `Speech generation failed: ${elevenLabsResponse.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to generate audio for your call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    console.log("Speech generated successfully");

    // ============================================================
    // STEP 3: Upload audio to Supabase Storage
    // ============================================================
    const audioFileName = `${userId}/reminder-${reminderId}-${Date.now()}.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from("call-audio")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      await updateHistoryStatus("failed", `Audio upload failed: ${uploadError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to prepare audio for your call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("call-audio")
      .createSignedUrl(audioFileName, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      await updateHistoryStatus("failed", "Audio URL generation failed");
      return new Response(
        JSON.stringify({ error: "Failed to prepare audio for your call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioUrl = signedUrlData.signedUrl;
    console.log("Audio uploaded successfully");

    // ============================================================
    // STEP 4: Make the call with Twilio
    // ============================================================
    // Update status to "in_progress" before calling
    await updateHistoryStatus("in_progress");

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const twiml = `
      <Response>
        <Play>${audioUrl}</Play>
        <Pause length="1"/>
        <Say voice="alice">Goodbye.</Say>
      </Response>
    `;

    // Build callback URL for Twilio to notify us of the actual call outcome
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;

    const twilioParams = new URLSearchParams({
      To: phoneNumber,
      From: TWILIO_PHONE_NUMBER,
      Twiml: twiml.trim(),
      StatusCallback: statusCallbackUrl,
      StatusCallbackEvent: "completed",
      // Enable Answering Machine Detection for voicemail detection
      MachineDetection: "Enable",
      MachineDetectionTimeout: "5",
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
      console.error("Call delivery error:", twilioResponse.status);
      const errorMsg = twilioResult.message || twilioResult.error_message || `Twilio error: ${twilioResponse.status}`;
      await updateHistoryStatus("failed", errorMsg);
      return new Response(
        JSON.stringify({ error: "Failed to initiate the call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // STEP 5: Store Twilio Call SID - status remains "in_progress"
    // The actual outcome will be updated by the twilio-status-callback webhook
    // ============================================================
    console.log("Call initiated successfully. Awaiting callback for final status.");
    
    // Update history with the Twilio Call SID so the callback can find it
    // Status stays "in_progress" until the callback updates it
    await updateHistoryStatus("in_progress", undefined, twilioResult.sid);

    return new Response(
      JSON.stringify({
        success: true,
        callSid: twilioResult.sid,
        message: "Call initiated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in make-call function:", errorMessage);
    
    // Update history to failed if we have a record
    if (callHistoryId && supabase) {
      try {
        const { data: currentRecord } = await supabase
          .from("call_history")
          .select("status")
          .eq("id", callHistoryId)
          .single();
        
        const record = currentRecord as any;
        if (record && record.status !== "failed") {
          // deno-lint-ignore no-explicit-any
          await (supabase as any)
            .from("call_history")
            .update({ 
              status: "failed", 
              error_message: errorMessage 
            })
            .eq("id", callHistoryId);
        }
      } catch (updateError) {
        console.error("Failed to update history with error:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
