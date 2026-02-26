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
    const { voiceId } = await req.json();

    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: "Missing voice ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize service role client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch the voice record and verify ownership
    const { data: voiceRecord, error: fetchError } = await supabase
      .from("user_voices")
      .select("*")
      .eq("id", voiceId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !voiceRecord) {
      console.error("Voice not found or access denied:", fetchError);
      return new Response(
        JSON.stringify({ error: "Voice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const elevenLabsVoiceId = voiceRecord.elevenlabs_voice_id;

    // Delete from ElevenLabs (if we have a valid voice ID)
    if (elevenLabsVoiceId && elevenLabsVoiceId !== "pending") {
      console.log("Deleting voice from ElevenLabs...");

      try {
        const deleteResponse = await fetch(
          `https://api.elevenlabs.io/v1/voices/${elevenLabsVoiceId}`,
          {
            method: "DELETE",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
            },
          }
        );

        if (!deleteResponse.ok) {
          console.error("ElevenLabs delete error:", deleteResponse.status);
        } else {
          console.log("Voice deleted from ElevenLabs");
        }
      } catch (elevenLabsError) {
        console.error("Error calling ElevenLabs delete API:", elevenLabsError);
        // Continue anyway
      }
    }

    // Update any reminders using this voice to fall back to friendly_female
    const { error: updateRemindersError } = await supabase
      .from("reminders")
      .update({ 
        voice: "friendly_female",
        custom_voice_id: null 
      })
      .eq("custom_voice_id", voiceId);

    if (updateRemindersError) {
      console.error("Error updating reminders:", updateRemindersError);
      // Continue anyway - we still want to delete the voice
    }

    // Delete from user_voices table
    const { error: deleteError } = await supabase
      .from("user_voices")
      .delete()
      .eq("id", voiceId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting voice record:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete voice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Voice deleted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Voice deleted successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-voice-clone function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
