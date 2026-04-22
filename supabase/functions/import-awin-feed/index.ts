// Awin datafeed importer (STREAMING version)
// The Awin gzipped feed is ~90 MB compressed (~500 MB decompressed) — far too
// large to load fully into edge-function memory (~150 MB limit).
// Strategy:
//   1. Stream the gzipped HTTP response through DecompressionStream("gzip")
//   2. Pipe through TextDecoderStream
//   3. Read line-by-line, parsing CSV as we go
//   4. Only keep deals matching our filters in memory (small subset)
//   5. Upsert in batches

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────────────────────────────────
// Streaming line iterator (handles CSV with quoted multi-line fields)
// ──────────────────────────────────────────────────────────────────────────────
async function* iterateCsvLines(stream: ReadableStream<string>): AsyncGenerator<string> {
  const reader = stream.getReader();
  let buffer = "";
  let inQuotes = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // Walk through buffer to find LINE boundaries that are NOT inside quotes
    let lineStart = 0;
    for (let i = 0; i < buffer.length; i++) {
      const c = buffer[i];
      if (c === '"') {
        // Toggle, accounting for escaped quotes ""
        if (inQuotes && buffer[i + 1] === '"') { i++; continue; }
        inQuotes = !inQuotes;
      } else if (c === "\n" && !inQuotes) {
        let line = buffer.slice(lineStart, i);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        yield line;
        lineStart = i + 1;
      }
    }
    // Keep unfinished tail in buffer
    buffer = buffer.slice(lineStart);
  }
  if (buffer.length > 0) {
    let line = buffer;
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.length > 0) yield line;
  }
}

// Parse a single CSV row into fields (handles quoted fields with commas)
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { fields.push(field); field = ""; }
      else field += c;
    }
  }
  fields.push(field);
  return fields;
}

// ──────────────────────────────────────────────────────────────────────────────
// Normalization helpers
// ──────────────────────────────────────────────────────────────────────────────
function inferCategory(category: string, title: string): string {
  const t = ` ${(title || "").toLowerCase()} `;
  const cat = ` ${(category || "").toLowerCase()} `;
  const all = t + cat;

  // ── HIGH PRIORITY: specific items that should NEVER be t-shirt/hoodie ────
  // Swimwear, underwear, lingerie → accessoires
  if (/(slip de bain|maillot de bain|bikini|swimsuit|swim short|boardshort|swimwear|swim brief|costume da bagno|badeanzug)/i.test(all)) return "accessoires";
  if (/(brassi[èe]re|sports bra|sport bra|culotte|boxer|underwear|sous-v[êe]tement|lingerie|caleçon|string|tanga)/i.test(all)) return "accessoires";
  // Socks, gloves, masks, headbands
  if (/(chaussette|socquette|sock |socks |bas |collant|tights|gants|glove|mitten|masque|mask |bandeau|headband|wristband|poignet)/i.test(all)) return "accessoires";
  // Bags, caps, belts, jewelry, watches, sunglasses
  if (/(casquette|cap |bonnet|beanie|chapeau|hat |bucket hat|9forty|59fifty|new era cap)/i.test(all)) return "accessoires";
  if (/(sac |bag |backpack|sac à dos|gym bag|sport bag|tote|pochette|wallet|portefeuille|porte-monnaie)/i.test(all)) return "accessoires";
  if (/(ceinture|belt |bracelet|collier|bague|jewel|watch |montre|sunglas|lunettes|écharpe|scarf|foulard)/i.test(all)) return "accessoires";
  // Sport equipment
  if (/(yoga (block|mat|brick)|bloc de yoga|tapis de yoga|haltère|dumbbell|kettlebell|élastique|resistance band|protège-tibia|shin guard|gourde|bottle|water bottle|towel|serviette)/i.test(all)) return "accessoires";
  // Costumes / disguises / home (not apparel)
  if (/(costume |disguise|déguisement|rideau|curtain|cushion|coussin|drap|bedding|housse|décoration)/i.test(all)) return "autres";

  // Short = pantalons (handball short, swim short already filtered above)
  if (/( short |shorts | bermuda)/i.test(all)) return "pantalons";

  // ── Category-field hints ───────────────────────────────────────────────
  if (/(jacket|veste|manteau|coat|blouson|parka|doudoune|bomber|puffer|gilet|anorak|windbreaker|softshell|shacket)/i.test(cat)) return "vestes";
  if (/(hoodie|sweat|capuche|sweatshirt|fleece|pullover|crewneck|sweater)/i.test(cat)) return "hoodies";
  if (/(pant|trouser|jean|legging|jogger|jogging|cargo|tracksuit|trackpant|sweatpant|pantalon)/i.test(cat)) return "pantalons";
  if (/(t-shirt|tshirt|polo|tank|jersey|maillot|chemise|shirt|top |tee )/i.test(cat)) return "t-shirts";
  if (/(sneaker|shoe|chaussure|basket|trainer|boot|sandal|tong|claquette|slide)/i.test(cat)) return "sneakers";
  if (/(robe |dress |jupe |skirt )/i.test(cat)) return "autres";

  // ── Title-based heuristics ─────────────────────────────────────────────
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","bomber","puffer","gilet","anorak","softshell","shacket","coupe-vent","coupe vent"];
  if (jacketKw.some(k => t.includes(k))) return "vestes";

  const hoodieKw = ["hoodie","sweat ","capuche","pullover","crewneck","sweater","fleece","half-zip","full zip","sweatshirt"];
  const hoodieExclude = ["short","pant","jogger","legging","jeans","sweatpant","skirt","robe","sock"];
  if (hoodieKw.some(k => t.includes(k)) && !hoodieExclude.some(k => t.includes(k))) return "hoodies";

  const pantsKw = ["pantalon","jogger","pant ","pants","legging","jogging","jeans","jean ","sweatpant","trackpant","tracksuit","cargo"];
  if (pantsKw.some(k => t.includes(k))) return "pantalons";

  const tshirtKw = ["t-shirt","tee ","tee-","jersey","polo ","maillot","tank top","crew "," shirt ","débardeur","camisole"];
  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";

  const sneakerKw = ["sneaker","basket","chaussure","shoe","air max","air force","dunk","jordan","yeezy","new balance","574","990","gel-","old skool","chuck taylor","stan smith","superstar","gazelle","samba","ultraboost","sandale","escarpin","talon","wedge heel","running","trainer"];
  if (sneakerKw.some(k => t.includes(k))) return "sneakers";

  // Robes / jupes → autres (pas de catégorie dédiée)
  if (/( robe | dress | jupe | skirt )/i.test(t)) return "autres";

  return "autres";
}

function inferGender(title: string, description: string, productCategory: string): string {
  const combined = ` ${(description || "").toLowerCase()} ${(title || "").toLowerCase()} ${(productCategory || "").toLowerCase()} `;

  const enfantKw = [" enfant","enfants","kids","junior","bébé","toddler","infant","youth","kinder"," boy "," girl "];
  const enfantExclude = ["baby tee","junior mesure"];
  if (enfantKw.some(k => combined.includes(k)) && !enfantExclude.some(k => combined.includes(k))) return "enfant";

  const femmeKw = ["pour femme","femmes","women","woman","wmns","w's ","ladies","damen",
    "baby tee","bra ","brassière","legging","sports bra","crop top","cropped","mini skirt","mini jupe","robe ","dress ","bikini","yoga","wide leg","high rise","ribbed tank"];
  const femmeExclude = ["dress shirt"];
  if (femmeKw.some(k => combined.includes(k)) && !femmeExclude.some(k => combined.includes(k))) return "femme";

  if (combined.includes("pour homme") || combined.includes("hommes") || combined.includes("men's") || combined.includes("for men") || combined.includes(" herren")) return "homme";

  return "unisexe";
}

function genderToLabel(g: string): string {
  return g === "homme" ? "Homme" : g === "femme" ? "Femme" : g === "enfant" ? "Enfant" : "Unisexe";
}

function cleanBrand(brand: string, merchant: string): string {
  if (!brand || brand.trim() === "") return merchant;
  const b = brand.trim();
  const lower = b.toLowerCase();
  if (lower === "nike sportswear") return "Nike";
  if (lower === "adidas originals" || lower === "adidas performance") return "adidas";
  if (lower === "jordan brand") return "Jordan";
  if (lower === "puma") return "PUMA";
  if (lower === "asics") return "ASICS";
  if (lower === "ugg") return "UGG";
  return b;
}

// Force HD versions of merchant/CDN image URLs.
// Awin/merchant feeds often expose low-res images by default — most CDNs accept
// width/quality params. We rewrite known patterns to request a 1200px version.
function upscaleImageUrl(url: string): string {
  if (!url) return url;
  try {
    let out = url.trim();

    // Awin productserve thumbnails: /pservice/v3/...?w=200 → w=1200
    out = out.replace(/([?&])(w|width|h|height)=\d+/gi, "$1$2=1200");

    // Scene7 / Demandware (adidas, nike partners, etc.): &wid=300&hei=300 → 1200
    out = out.replace(/([?&])(wid|hei|sw|sh)=\d+/gi, "$1$2=1200");

    // Shopify CDN: _200x.jpg / _small.jpg / _medium.jpg / _grande.jpg → _1200x
    out = out.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|original)(?=\.(jpe?g|png|webp))/gi, "_1200x");
    out = out.replace(/_\d{2,4}x(\d{2,4})?(?=\.(jpe?g|png|webp))/gi, "_1200x");

    // Generic /thumb/ or /small/ path segments → /large/
    out = out.replace(/\/(thumb|thumbnail|small|medium|tiny|mini)\//gi, "/large/");

    // Snipes / Sneakin patterns: -100.jpg / -300.jpg → -1200.jpg (size suffix)
    out = out.replace(/-(\d{2,3})(?=\.(jpe?g|png|webp)(\?|$))/gi, "-1200");

    // imgix / Cloudinary: insert w_1200 if not present
    if (/cloudinary\.com\/.+\/upload\//i.test(out) && !/\/w_\d+/i.test(out)) {
      out = out.replace(/\/upload\//i, "/upload/w_1200,q_auto,f_auto/");
    }

    return out;
  } catch {
    return url;
  }
}

function toNum(v: string): number | null {
  if (!v || v.trim() === "") return null;
  const cleaned = v.replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AWIN_API_KEY = Deno.env.get("AWIN_API_KEY");
    if (!AWIN_API_KEY) throw new Error("AWIN_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Accept FID via query param (?fid=48225) or body { fid }
    const url = new URL(req.url);
    let fidParam = url.searchParams.get("fid");
    if (!fidParam && req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.fid) fidParam = String(body.fid);
      } catch { /* no body */ }
    }
    const ALL_FIDS = ["48225", "87190", "87833", "90621", "111256", "112989"];
    if (!fidParam || !ALL_FIDS.includes(fidParam)) {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid `fid` parameter",
          valid_fids: ALL_FIDS,
          hint: "Call with ?fid=<one of valid_fids>. Use `import-awin-orchestrator` to import all in sequence.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const COLUMNS = [
      "aw_deep_link","product_name","aw_product_id","merchant_product_id",
      "merchant_image_url","description","merchant_category","search_price",
      "merchant_name","merchant_id","category_name","aw_image_url","currency",
      "merchant_deep_link","brand_name","colour","rrp_price","savings_percent",
      "in_stock","stock_status","large_image","aw_thumb_url","valid_from","valid_to",
      // Some merchants (e.g. Snipes EU) ship the RRP only via product_price_old / base_price / saving
      "product_price_old","base_price","saving",
    ].join(",");

    const feedUrl = `https://productdata.awin.com/datafeed/download/apikey/${AWIN_API_KEY}/language/fr/fid/${fidParam}/rid/0/hasEnhancedFeeds/0/columns/${COLUMNS}/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/`;

    console.log(`📡 Streaming Awin feed for FID ${fidParam}...`);
    const feedRes = await fetch(feedUrl);
    if (!feedRes.ok || !feedRes.body) {
      throw new Error(`Awin feed download failed: ${feedRes.status}`);
    }

    // Pipeline: gzipped bytes → decompressed bytes → text lines
    const textStream = feedRes.body
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(new TextDecoderStream("utf-8"));

    let headers: string[] | null = null;
    let rowCount = 0;
    let kept = 0;
    let skippedNoImage = 0, skippedNoPrice = 0, skippedOutOfStock = 0, skippedNoTitle = 0;
    const importedIds = new Set<string>();
    let buffer: Record<string, any>[] = [];
    const BATCH_SIZE = 250;

    async function flushBuffer() {
      if (buffer.length === 0) return;
      const { error } = await supabase.from("deals").upsert(buffer, { onConflict: "id" });
      if (error) {
        console.error("Upsert error:", error.message);
        throw error;
      }
      kept += buffer.length;
      buffer = [];
    }

    for await (const line of iterateCsvLines(textStream)) {
      if (!line) continue;

      if (!headers) {
        headers = parseRow(line);
        console.log(`📋 Headers (${headers.length}): ${headers.slice(0, 5).join(", ")}...`);
        continue;
      }

      rowCount++;
      const fields = parseRow(line);
      if (fields.length !== headers.length) continue;

      const r: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) r[headers[i]] = fields[i];

      // Stock filter
      const inStock = (r.in_stock || "").trim();
      const stockStatus = (r.stock_status || "").toLowerCase();
      if (inStock === "0" || stockStatus === "out of stock" || stockStatus === "outofstock") {
        skippedOutOfStock++;
        continue;
      }

      // Image — prefer the largest available, then upscale URL params to HD
      const rawImage = r.large_image || r.aw_image_url || r.merchant_image_url || "";
      if (!rawImage || !rawImage.startsWith("http")) { skippedNoImage++; continue; }
      const imageUrl = upscaleImageUrl(rawImage);

      // Price — sale_price comes from search_price.
      // For original_price, try rrp_price first (standard Awin), then merchant-specific
      // fallbacks: product_price_old (used by Snipes EU) and base_price.
      // Also derive an original price from `saving` (absolute discount in currency)
      // when no reference price column is filled.
      const salePrice = toNum(r.search_price);
      let originalPrice =
        toNum(r.rrp_price) ??
        toNum(r.product_price_old) ??
        toNum(r.base_price);
      const savingAbs = toNum(r.saving);
      if ((!originalPrice || originalPrice <= 0) && salePrice && savingAbs && savingAbs > 0) {
        originalPrice = salePrice + savingAbs;
      }
      // Sanitize: 0 or values not strictly greater than sale_price are not real RRPs
      if (!originalPrice || originalPrice <= 0 || (salePrice && originalPrice <= salePrice)) {
        originalPrice = null;
      }
      if (!salePrice || salePrice <= 0) { skippedNoPrice++; continue; }

      let discount = toNum(r.savings_percent);
      if ((!discount || discount <= 0) && originalPrice && originalPrice > salePrice) {
        discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
      }
      discount = discount ?? 0;

      const merchantId = r.merchant_id || "0";
      const productId = r.aw_product_id || r.merchant_product_id || "";
      if (!productId) continue;
      const id = `awin-${merchantId}-${productId}`;
      if (importedIds.has(id)) continue;
      importedIds.add(id);

      const title = (r.product_name || "").trim();
      if (!title) { skippedNoTitle++; continue; }

      const merchant = (r.merchant_name || "").trim() || "Awin";
      const brand = cleanBrand(r.brand_name || "", merchant);
      const category = inferCategory(r.merchant_category || r.category_name || "", title);
      const gender = inferGender(title, r.description || "", r.merchant_category || "");

      let dealLevel = "promo-normale", flameCount = 1;
      if (discount >= 50) { dealLevel = "hot-deal"; flameCount = 3; }
      else if (discount >= 30) { dealLevel = "bon-deal"; flameCount = 2; }

      buffer.push({
        id,
        title: title.slice(0, 500),
        brand,
        category,
        gender,
        gender_label: genderToLabel(gender),
        sale_price: salePrice,
        original_price: originalPrice,
        discount_percent: discount,
        image_url: imageUrl,
        product_url: r.merchant_deep_link || r.aw_deep_link || "",
        affiliate_url: r.aw_deep_link || "",
        merchant,
        source: "awin",
        currency: r.currency || "EUR",
        description: (r.description || "").slice(0, 2000),
        promo_start_date: r.valid_from || null,
        promo_end_date: r.valid_to || null,
        is_super_deal: discount >= 50,
        deal_level: dealLevel,
        flame_count: flameCount,
        detected_at: new Date().toISOString(),
      });

      if (buffer.length >= BATCH_SIZE) await flushBuffer();

      if (rowCount % 5000 === 0) {
        console.log(`⏳ ${rowCount} rows scanned, ${kept + buffer.length} kept`);
      }
    }

    await flushBuffer();
    console.log(`✅ Total: ${rowCount} rows scanned, ${kept} imported`);

    // Cleanup: remove deals from THIS merchant only that are NOT in this import
    // (out-of-stock / removed). We detect the merchant prefix from importedIds.
    let deleted = 0;
    const merchantPrefixes = new Set<string>();
    for (const id of importedIds) {
      // id format: awin-{merchantId}-{productId} → keep "awin-{merchantId}-"
      const parts = id.split("-");
      if (parts.length >= 3) merchantPrefixes.add(`${parts[0]}-${parts[1]}-`);
    }

    for (const prefix of merchantPrefixes) {
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page } = await supabase
          .from("deals").select("id").like("id", `${prefix}%`)
          .range(from, from + pageSize - 1);
        if (!page || page.length === 0) break;
        const toDelete = page.filter(d => !importedIds.has(d.id)).map(d => d.id);
        if (toDelete.length > 0) {
          for (let j = 0; j < toDelete.length; j += 500) {
            const slice = toDelete.slice(j, j + 500);
            await supabase.from("deals").delete().in("id", slice);
          }
          deleted += toDelete.length;
        }
        if (page.length < pageSize) break;
        from += pageSize;
      }
    }

    const result = {
      success: true,
      fid: fidParam,
      total_rows: rowCount,
      imported: kept,
      deleted_stale: deleted,
      skipped: { no_image: skippedNoImage, no_price: skippedNoPrice, out_of_stock: skippedOutOfStock, no_title: skippedNoTitle },
    };
    console.log("🎉 Done:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
