// Proxy d'images pour le canvas vidéo : bypass hotlink protection + CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function tryFetch(url: string, referer: string): Promise<Response | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Referer": referer,
      },
      redirect: "follow",
    });
    if (r.ok) return r;
  } catch (_) {}
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response("bad url", { status: 400, headers: corsHeaders });
    }

    const origin = new URL(url).origin + "/";

    // 1) tentative directe avec referer = origine
    let upstream = await tryFetch(url, origin);

    // 2) referer awin (productserve sert la plupart des feeds awin)
    if (!upstream) upstream = await tryFetch(url, "https://www.awin1.com/");

    // 3) fallback wsrv.nl (proxy d'images public)
    if (!upstream) {
      const stripped = url.replace(/^https?:\/\//, "");
      const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(stripped)}&w=1200&h=1200&fit=contain&bg=white`;
      upstream = await tryFetch(wsrv, "https://wsrv.nl/");
    }

    if (!upstream) {
      return new Response("upstream unreachable", { status: 502, headers: corsHeaders });
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
    return new Response(String((e as Error)?.message || e), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
