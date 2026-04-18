// Normalizes / repairs deal image URLs at render time.
// Some merchant CDNs block hotlinking (e.g. Awin's images2.productserve.com → 403),
// so we extract the upstream URL and serve a working size.

const SPORTSPAR_RE = /sportspar\.de\/media\/image\/([0-9a-f]{2})\/([0-9a-f]{2})\/([0-9a-f]{2})\/([^?"'\s]+?)(?:_\d+x\d*)?\.(jpg|jpeg|png|webp)/i;

function fixSportspar(rawUrl: string): string {
  // Decode the upstream URL embedded in productserve's `url=ssl%3A...` param
  try {
    const u = new URL(rawUrl);
    let upstream = u.searchParams.get("url") || "";
    upstream = decodeURIComponent(upstream).replace(/^ssl:/, "https://").replace(/^http:/, "https:");
    if (!upstream.startsWith("http")) upstream = "https://" + upstream.replace(/^\/+/, "");
    const m = upstream.match(SPORTSPAR_RE);
    if (!m) return upstream || rawUrl;
    const [, a, b, c, name, ext] = m;
    // _600x600 is the largest size sportspar serves publicly; bigger 404s.
    return `https://www.sportspar.de/media/image/${a}/${b}/${c}/${name}_600x600.${ext}`;
  } catch {
    return rawUrl;
  }
}

export function upgradeImageUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  if (url.includes("images2.productserve.com") || url.includes("images.productserve.com")) {
    return fixSportspar(url);
  }
  // Snipes: upgrade to high-res square crop
  if (url.includes("asset.snipes.com")) {
    return url.replace(/w_\d+,h_\d+,c_pad/, "w_900,h_900,c_pad").replace(/q_\d+/, "q_90");
  }
  return url;
}
