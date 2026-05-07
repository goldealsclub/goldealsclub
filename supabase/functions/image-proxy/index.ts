// Proxy d'images pour le canvas vidéo : bypass hotlink protection + CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response("bad url", { status: 400, headers: corsHeaders });
    }

    // Imite un vrai navigateur pour contourner anti-hotlink
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Referer": new URL(url).origin + "/",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new Response(`upstream ${upstream.status}`, { status: 502, headers: corsHeaders });
    }

    const ct = upstream.headers.get("content-type") || "image/jpeg";
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response(String(e?.message || e), { status: 500, headers: corsHeaders });
  }
});
