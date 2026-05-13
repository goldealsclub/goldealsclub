// Generates a lofi/chillhop music track via ElevenLabs Music API.
// Returns raw MP3 bytes. Cached in Supabase Storage by duration bucket.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROMPTS = [
  "warm lofi hip hop instrumental, dusty vinyl crackle, mellow piano chords, soft jazz drums, late-night mood, no vocals",
  "minimal chill lofi beat, vintage Rhodes piano, soft 808 bass, tape hiss, slow swing, no vocals",
  "cinematic editorial lofi, smooth jazz guitar, warm pad, brushed snare, fashion runway vibe, no vocals",
  "ambient downtempo lofi, dreamy synth pad, gentle kick, melancholic chord progression, no vocals",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    let durationMs = Math.round(Number(body.duration_ms) || 30_000);
    // ElevenLabs Music: between 10s and 5min
    if (durationMs < 10_000) durationMs = 10_000;
    if (durationMs > 180_000) durationMs = 180_000;

    const prompt =
      typeof body.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt
        : PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

    const upstream = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: durationMs,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("ElevenLabs music error", upstream.status, errText);
      return new Response(
        JSON.stringify({ error: `ElevenLabs ${upstream.status}: ${errText.slice(0, 500)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("generate-lofi-music error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
