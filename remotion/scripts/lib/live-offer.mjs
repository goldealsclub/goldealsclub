/**
 * Vérifie une offre directement sur la page du marchand, au moment de faire la vidéo.
 *
 * Constat du 19/10/2026 : certains flux annoncent un prix plus bas que celui affiché
 * sur le site (ex. Sport Outlet : Converse 11,19 € dans le flux, 19,99 € sur la page,
 * le prix du flux inclut une remise réservée aux membres). Une offre n'entre dans la
 * vidéo que si la page du marchand confirme le prix et la disponibilité.
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const num = (v) => {
  if (v == null) return NaN;
  const s = String(v).replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  // « 1.299,99 » / « 1299,99 » / « 1299.99 »
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(norm);
};

function fromJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const stack = [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) { stack.push(...node); continue; }
      const type = [].concat(node["@type"] || []).join(",");
      if (/Offer/.test(type)) {
        const price = num(node.price ?? node.lowPrice ?? node.priceSpecification?.price);
        if (price > 0) out.push({ price, availability: String(node.availability || "") });
      }
      for (const v of Object.values(node)) if (v && typeof v === "object") stack.push(v);
    }
  }
  return out;
}

function fromMeta(html) {
  const out = [];
  for (const re of [
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/gi,
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/gi,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["']/gi,
  ]) {
    for (const m of html.matchAll(re)) { const p = num(m[1]); if (p > 0) out.push({ price: p, availability: "" }); }
  }
  return out;
}

/**
 * @returns {{status:"ok"|"prix-different"|"epuise"|"introuvable"|"non-verifiable", livePrice?:number, detail:string}}
 */
export async function checkLiveOffer({ productUrl, salePrice }) {
  let r;
  try {
    r = await fetch(productUrl, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { status: "non-verifiable", detail: `page injoignable (${e.cause?.code || e.name})` };
  }
  if (r.status === 404 || r.status === 410) return { status: "introuvable", detail: `page produit ${r.status}` };
  if (!r.ok) return { status: "non-verifiable", detail: `HTTP ${r.status}` };
  const html = await r.text();
  const offers = [...fromJsonLd(html), ...fromMeta(html)];
  if (!offers.length) return { status: "non-verifiable", detail: "prix absent de la page" };

  // Le prix du flux doit correspondre à l'un des prix publiés (variantes de taille comprises).
  const tol = (p) => Math.max(0.5, p * 0.02);
  const match = offers.find((o) => Math.abs(o.price - salePrice) <= tol(salePrice));
  const soldOut = (o) => /OutOfStock|SoldOut|Discontinued/i.test(o.availability);
  if (match) {
    if (soldOut(match) && offers.every(soldOut)) return { status: "epuise", livePrice: match.price, detail: "rupture de stock" };
    return { status: "ok", livePrice: match.price, detail: `prix confirmé ${match.price.toFixed(2)} €` };
  }
  const shown = [...new Set(offers.map((o) => o.price.toFixed(2)))].slice(0, 3).join(" / ");
  return { status: "prix-different", livePrice: offers[0].price, detail: `page : ${shown} € ≠ flux ${Number(salePrice).toFixed(2)} €` };
}
