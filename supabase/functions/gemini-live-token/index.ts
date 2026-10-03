import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle browser CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    // Get Gemini API key from Supabase Secret
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Create Gemini client
    const ai = new GoogleGenAI({
      apiKey,
    });

    // Create short-lived token for Gemini Live
    const token = await ai.authTokens.create({
      config: {
        uses: 1,

        // Token can be used to start a session for 1 minute
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),

        // Session token expires after 30 minutes
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),

        // Restrict token to VOXA AI Live model/config
        liveConnectConstraints: {
          model: "gemini-3.8-live",
          config: {
            responseModalities: ["AUDIO"],
            sessionResumption: {},
          },
        },
      },
    });

    if (!token?.name) {
      throw new Error("Gemini did not return an ephemeral token");
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: token.name,
        expiresIn: 30 * 60,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Gemini Live Token Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Gemini Live token",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
