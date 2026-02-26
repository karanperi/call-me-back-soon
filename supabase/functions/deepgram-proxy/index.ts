/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");

Deno.serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  if (!DEEPGRAM_API_KEY) {
    console.error("DEEPGRAM_API_KEY is not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  // Authenticate the user via token query parameter
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const language = url.searchParams.get("language") || "en";

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = claimsData.claims.sub as string;
  console.log("Authenticated WebSocket connection for user");

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let deepgramSocket: WebSocket | null = null;
  let audioBuffer: (string | ArrayBuffer | Blob)[] = [];

  clientSocket.onopen = () => {
    const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.set("model", "nova-2");
    deepgramUrl.searchParams.set("language", language);
    deepgramUrl.searchParams.set("smart_format", "true");
    deepgramUrl.searchParams.set("punctuate", "true");
    deepgramUrl.searchParams.set("interim_results", "true");

    deepgramSocket = new WebSocket(deepgramUrl.toString(), [
      "token",
      DEEPGRAM_API_KEY,
    ]);

    deepgramSocket.onopen = () => {
      console.log("Deepgram connected, flushing", audioBuffer.length, "buffered chunks");
      for (const chunk of audioBuffer) {
        deepgramSocket!.send(chunk);
      }
      audioBuffer = [];
    };

    deepgramSocket.onmessage = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    };

    deepgramSocket.onerror = () => {
      console.error("Deepgram WebSocket error");
    };

    deepgramSocket.onclose = (event) => {
      console.log("Deepgram WebSocket closed:", event.code);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1000, "Deepgram connection closed");
      }
    };
  };

  clientSocket.onmessage = (event) => {
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.send(event.data);
    } else {
      audioBuffer.push(event.data);
    }
  };

  clientSocket.onerror = () => {
    console.error("Client WebSocket error");
  };

  clientSocket.onclose = () => {
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.close(1000, "Client disconnected");
    }
    deepgramSocket = null;
    audioBuffer = [];
  };

  return response;
});
