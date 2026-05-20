// Sert une piste lofi royalty-free (Pixabay CC0 / Incompetech CC-BY fallback).
// Plus de dépendance ElevenLabs. Tente plusieurs sources stables jusqu'à succès.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Piste lofi royalty-free, dans l'ordre de préférence.
// - Pixabay : CC0, aucune attribution requise.
// - Incompetech (Kevin MacLeod) : CC-BY, attribution recommandée — fallback fiable.
const TRACKS = [
  "https://cdn.pixabay.com/audio/2023/09/05/audio_168a3e22b8.mp3",
  "https://cdn.pixabay.com/audio/2024/03/04/audio_8c4fd76fa6.mp3",
  "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d6dd.mp3",
  "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Acid%20Jazz.mp3",
  "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bass%20Walker.mp3",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

async function fetchFirstWorking(): Promise<{ buf: ArrayBuffer; url: string } | null> {
  for (const url of TRACKS) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Referer": "https://pixabay.com/",
          "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
        },
      });
      if (!r.ok) {
        console.warn("Track failed", r.status, url);
        continue;
      }
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 20_000) continue;
      return { buf, url };
    } catch (e) {
      console.warn("Track error", url, (e as Error).message);
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const got = await fetchFirstWorking();
    if (!got) {
      return new Response(
        JSON.stringify({ error: "No royalty-free track reachable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("Served lofi track", got.url, got.buf.byteLength, "bytes");
    return new Response(got.buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Source": got.url,
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
