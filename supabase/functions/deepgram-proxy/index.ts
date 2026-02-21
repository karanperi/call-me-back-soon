/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");

Deno.serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  if (!DEEPGRAM_API_KEY) {
    console.error("DEEPGRAM_API_KEY is not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const url = new URL(req.url);
  const language = url.searchParams.get("language") || "en";

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let deepgramSocket: WebSocket | null = null;
  // Buffer audio chunks that arrive before Deepgram is connected
  let audioBuffer: (string | ArrayBuffer | Blob)[] = [];

  clientSocket.onopen = () => {
    console.log("Client WebSocket connected, connecting to Deepgram...");

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
      console.log("Connected to Deepgram API, flushing", audioBuffer.length, "buffered chunks");
      // Flush any audio that arrived while we were connecting
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

    deepgramSocket.onerror = (event) => {
      console.error("Deepgram WebSocket error:", event);
    };

    deepgramSocket.onclose = (event) => {
      console.log("Deepgram WebSocket closed:", event.code, event.reason);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1000, "Deepgram connection closed");
      }
    };
  };

  clientSocket.onmessage = (event) => {
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.send(event.data);
    } else {
      // Deepgram not ready yet — buffer the chunk
      console.log("Buffering audio chunk, Deepgram state:", deepgramSocket?.readyState);
      audioBuffer.push(event.data);
    }
  };

  clientSocket.onerror = (event) => {
    console.error("Client WebSocket error:", event);
  };

  clientSocket.onclose = (event) => {
    console.log("Client WebSocket closed:", event.code, event.reason);
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.close(1000, "Client disconnected");
    }
    deepgramSocket = null;
    audioBuffer = [];
  };

  return response;
});
