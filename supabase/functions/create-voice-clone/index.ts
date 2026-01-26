import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoiceCloneRequest {
  audioBase64: string;
  voiceName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      console.error("Missing ELEVENLABS_API_KEY");
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

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const { audioBase64, voiceName }: VoiceCloneRequest = await req.json();

    if (!audioBase64 || !voiceName) {
      return new Response(
        JSON.stringify({ error: "Missing audio data or voice name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate voice name
    const trimmedName = voiceName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return new Response(
        JSON.stringify({ error: "Voice name must be 1-50 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize service role client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if user already has a voice (limit: 1)
    const { data: existingVoices, error: checkError } = await supabase
      .from("user_voices")
      .select("id")
      .eq("user_id", userId);

    if (checkError) {
      console.error("Error checking existing voices:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing voices" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingVoices && existingVoices.length > 0) {
      return new Response(
        JSON.stringify({ error: "You already have a voice clone. Please delete it before creating a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create "processing" record in user_voices
    const { data: voiceRecord, error: insertError } = await supabase
      .from("user_voices")
      .insert({
        user_id: userId,
        name: trimmedName,
        elevenlabs_voice_id: "pending",
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating voice record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create voice record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voiceId = voiceRecord.id;

    try {
      // Convert base64 to blob
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: "audio/webm" });

      // Call ElevenLabs Instant Voice Clone API
      const formData = new FormData();
      formData.append("name", `Yaad - ${trimmedName}`);
      formData.append("description", "Yaad familiar voice");
      formData.append("files", audioBlob, "voice_recording.webm");

      console.log(`Calling ElevenLabs API to clone voice for user ${userId}...`);

      const elevenLabsResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: formData,
      });

      if (!elevenLabsResponse.ok) {
        const errorText = await elevenLabsResponse.text();
        console.error("ElevenLabs API error:", errorText);

        // Update record as failed
        await supabase
          .from("user_voices")
          .update({
            status: "failed",
            error_message: `Voice cloning failed: ${elevenLabsResponse.status}`,
          })
          .eq("id", voiceId);

        return new Response(
          JSON.stringify({ error: "We couldn't create your voice. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const elevenLabsResult = await elevenLabsResponse.json();
      const elevenLabsVoiceId = elevenLabsResult.voice_id;

      console.log(`Voice cloned successfully. ElevenLabs voice ID: ${elevenLabsVoiceId}`);

      // Update record with voice_id and status 'ready'
      const { error: updateError } = await supabase
        .from("user_voices")
        .update({
          elevenlabs_voice_id: elevenLabsVoiceId,
          status: "ready",
          error_message: null,
        })
        .eq("id", voiceId);

      if (updateError) {
        console.error("Error updating voice record:", updateError);
        // Voice was created on ElevenLabs but we failed to update locally
        // This is a partial success
      }

      return new Response(
        JSON.stringify({
          success: true,
          voiceId: voiceId,
          message: "Voice created successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error during voice cloning:", error);

      // Update record as failed
      await supabase
        .from("user_voices")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", voiceId);

      return new Response(
        JSON.stringify({ error: "We couldn't create your voice. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in create-voice-clone function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
