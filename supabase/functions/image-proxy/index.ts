// Proxy d'images pour le canvas vidéo : bypass hotlink protection + CORS.
// Sécurité : allowlist d'hôtes de CDN connus + blocage des plages d'IP privées
// pour prévenir les attaques SSRF (instance metadata, services internes…).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Suffixes d'hôtes autorisés (matchés via endsWith sur le hostname).
const ALLOWED_HOST_SUFFIXES = [
  // Awin / Productserve (flux affiliation)
  "awin.com", "awin1.com", "productserve.com", "zenaps.com",
  // Wsrv (proxy public d'images)
  "wsrv.nl", "images.weserv.nl",
  // CDN marchands courants
  "nike.com", "snipes.com", "snipes-static.com", "jdsports.com", "jdsports.fr",
  "adidas.com", "adidas-group.com", "puma.com", "newbalance.com",
  "scene7.com", "akamaihd.net", "akamaized.net", "cloudfront.net",
  "shopifycdn.com", "shopify.com", "fastly.net", "imgix.net", "cdninstagram.com",
  "googleusercontent.com", "ggpht.com", "supabase.co", "supabase.in",
];

function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((s) => h === s || h.endsWith("." + s));
}

function isPrivateIp(host: string): boolean {
  // IPv4 littéral
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6 littéraux dangereux
  if (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }
  // hostnames internes
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  return false;
}

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

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response("bad url", { status: 400, headers: corsHeaders });
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new Response("forbidden scheme", { status: 403, headers: corsHeaders });
    }

    if (isPrivateIp(parsed.hostname)) {
      return new Response("forbidden host", { status: 403, headers: corsHeaders });
    }

    if (!isAllowedHost(parsed.hostname)) {
      return new Response("host not allowed", { status: 403, headers: corsHeaders });
    }

    const origin = parsed.origin + "/";

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
    if (!ct.startsWith("image/")) {
      return new Response("not an image", { status: 415, headers: corsHeaders });
    }
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
