/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");

Deno.serve((req) => {
  // Only handle WebSocket upgrades
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  if (!DEEPGRAM_API_KEY) {
    console.error("DEEPGRAM_API_KEY is not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  // Parse language from query params
  const url = new URL(req.url);
  const language = url.searchParams.get("language") || "en";

  // Upgrade the client connection to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let deepgramSocket: WebSocket | null = null;

  clientSocket.onopen = () => {
    console.log("Client WebSocket connected, connecting to Deepgram...");

    // Build Deepgram URL with parameters
    const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.set("model", "nova-2");
    deepgramUrl.searchParams.set("language", language);
    deepgramUrl.searchParams.set("smart_format", "true");
    deepgramUrl.searchParams.set("punctuate", "true");
    deepgramUrl.searchParams.set("interim_results", "true");
    deepgramUrl.searchParams.set("encoding", "opus");
    deepgramUrl.searchParams.set("sample_rate", "48000");

    // Connect to Deepgram
    deepgramSocket = new WebSocket(deepgramUrl.toString(), [
      "token",
      DEEPGRAM_API_KEY,
    ]);

    deepgramSocket.onopen = () => {
      console.log("Connected to Deepgram API");
    };

    // Forward Deepgram transcription responses to the browser
    deepgramSocket.onmessage = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        // Forward the transcript JSON as-is to the browser
        clientSocket.send(event.data);
      }
    };

    deepgramSocket.onerror = (event) => {
      console.error("Deepgram WebSocket error:", event);
    };

    deepgramSocket.onclose = (event) => {
      console.log("Deepgram WebSocket closed:", event.code, event.reason);
      // Close client connection when Deepgram disconnects
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1000, "Deepgram connection closed");
      }
    };
  };

  // Forward audio data from browser to Deepgram
  clientSocket.onmessage = (event) => {
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.send(event.data);
    }
  };

  clientSocket.onerror = (event) => {
    console.error("Client WebSocket error:", event);
  };

  clientSocket.onclose = (event) => {
    console.log("Client WebSocket closed:", event.code, event.reason);
    // Close Deepgram connection when client disconnects
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.close(1000, "Client disconnected");
    }
    deepgramSocket = null;
  };

  return response;
});
