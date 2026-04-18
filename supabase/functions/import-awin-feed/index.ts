// Awin datafeed importer
// - Downloads the gzipped CSV feed from Awin
// - Parses it
// - Normalizes brand/category/gender via shared logic
// - Upserts into the `deals` table WITHOUT deleting deals from other sources
//   (only awin-prefixed IDs may be cleaned up)
//
// Trigger: manual (admin button) or daily cron via pg_cron + pg_net.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gunzipSync } from "https://deno.land/x/compress@v0.4.5/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────────────────────────────────
// CSV parser (handles quoted fields with embedded commas / newlines)
// ──────────────────────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(r => r.length === headers.length)
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
      return obj;
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Reused normalization helpers (subset — Awin feed brands are usually clean)
// ──────────────────────────────────────────────────────────────────────────────
function inferCategory(category: string, title: string): string {
  const t = ` ${(title || "").toLowerCase()} `;
  const cat = (category || "").toLowerCase();

  // Map Awin merchant_category strings
  if (/(jacket|veste|manteau|coat|blouson|parka|doudoune|bomber|puffer|gilet|anorak)/i.test(cat)) return "vestes";
  if (/(hoodie|sweat|capuche|sweatshirt|fleece)/i.test(cat)) return "hoodies";
  if (/(pant|trouser|jean|legging|short|jogger|jogging|cargo|bermuda)/i.test(cat)) return "pantalons";
  if (/(t-shirt|tee|tshirt|polo|tank|jersey|maillot|chemise|shirt)/i.test(cat)) return "t-shirts";
  if (/(sneaker|shoe|chaussure|basket|trainer|boot|sandal|tong)/i.test(cat)) return "sneakers";
  if (/(cap|hat|bag|sock|belt|wallet|sunglas|beanie|scarf|glove|accessor|jewel|watch|montre)/i.test(cat)) return "accessoires";

  // Fallback by title keywords
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","bomber","puffer","gilet","anorak","softshell","shacket"];
  if (jacketKw.some(k => t.includes(k))) return "vestes";
  const hoodieKw = ["hoodie","sweat ","capuche","pullover","crewneck","sweater","fleece","half-zip","full zip"];
  const hoodieExclude = ["short","pant","jogger","legging","jeans","sweatpant","skirt","robe","sock"];
  if (hoodieKw.some(k => t.includes(k)) && !hoodieExclude.some(k => t.includes(k))) return "hoodies";
  const pantsKw = ["pantalon","jogger","pant ","pants","legging","shorts","bermuda","cargo","jogging","jeans","jean ","sweatpant","trackpant","tracksuit"];
  if (pantsKw.some(k => t.includes(k))) return "pantalons";
  const tshirtKw = ["t-shirt","tee ","tee-","jersey","polo ","maillot","tank top","crew "," shirt "];
  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";
  const accessKw = ["casquette","cap ","sac ","bag ","backpack","chaussette","sock","beanie","ceinture","belt","scarf","wallet","sunglas","9forty","59fifty","new era","bucket","trucker"];
  if (accessKw.some(k => t.includes(k))) return "accessoires";
  const sneakerKw = ["sneaker","basket","chaussure","shoe","air max","air force","dunk","jordan","yeezy","new balance","574","990","gel-","old skool","chuck taylor","stan smith","superstar","gazelle","samba","ultraboost","slide","sandale","claquette"];
  if (sneakerKw.some(k => t.includes(k))) return "sneakers";

  return "autres";
}

function inferGender(genderField: string, title: string, description: string, productCategory: string): string {
  const combined = ` ${(description || "").toLowerCase()} ${(title || "").toLowerCase()} ${(productCategory || "").toLowerCase()} `;

  const enfantKw = [" enfant","enfants","kids","junior","bébé","toddler","infant","youth","kinder"," boy "," girl "];
  const enfantExclude = ["baby tee","junior mesure"];
  if (enfantKw.some(k => combined.includes(k)) && !enfantExclude.some(k => combined.includes(k))) return "enfant";

  const femmeKw = ["pour femme","femmes","women","woman","wmns","w's ","ladies","damen",
    "baby tee","bra ","brassière","legging","sports bra","crop top","cropped","mini skirt","mini jupe","robe ","dress ","bikini","yoga","wide leg","high rise","ribbed tank"];
  const femmeExclude = ["dress shirt"];
  if (femmeKw.some(k => combined.includes(k)) && !femmeExclude.some(k => combined.includes(k))) return "femme";

  if (combined.includes("pour homme") || combined.includes("hommes") || combined.includes("men's") || combined.includes("for men") || combined.includes(" herren")) return "homme";

  const g = (genderField || "").toLowerCase();
  if (g === "homme" || g === "men" || g === "male") return "homme";
  if (g === "femme" || g === "women" || g === "female") return "femme";
  if (g === "enfant" || g === "kids" || g === "child") return "enfant";
  return "unisexe";
}

function genderToLabel(g: string): string {
  return g === "homme" ? "Homme" : g === "femme" ? "Femme" : g === "enfant" ? "Enfant" : "Unisexe";
}

function cleanBrand(brand: string, merchant: string): string {
  if (!brand || brand.trim() === "") return merchant;
  const b = brand.trim();
  const lower = b.toLowerCase();
  // Map common variants
  if (lower === "nike sportswear") return "Nike";
  if (lower === "adidas originals" || lower === "adidas performance") return "adidas";
  if (lower === "jordan brand") return "Jordan";
  if (lower === "puma") return "PUMA";
  if (lower === "asics") return "ASICS";
  if (lower === "ugg") return "UGG";
  return b;
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

    // Build the Awin URL with the secret API key
    const FIDS = "48225,87190,87833,90621";
    const COLUMNS = [
      "aw_deep_link","product_name","aw_product_id","merchant_product_id",
      "merchant_image_url","description","merchant_category","search_price",
      "merchant_name","merchant_id","category_name","aw_image_url","currency",
      "merchant_deep_link","brand_name","colour","rrp_price","savings_percent",
      "in_stock","stock_status","large_image","aw_thumb_url","valid_from","valid_to",
    ].join(",");

    const feedUrl = `https://productdata.awin.com/datafeed/download/apikey/${AWIN_API_KEY}/language/fr/fid/${FIDS}/rid/0/hasEnhancedFeeds/0/columns/${COLUMNS}/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/`;

    console.log("📡 Downloading Awin feed...");
    const feedRes = await fetch(feedUrl);
    if (!feedRes.ok) throw new Error(`Awin feed download failed: ${feedRes.status} ${await feedRes.text()}`);

    const gzBuf = new Uint8Array(await feedRes.arrayBuffer());
    console.log(`📦 Downloaded ${(gzBuf.length / 1024 / 1024).toFixed(2)} MB gzipped`);

    const csvBuf = gunzipSync(gzBuf);
    const csvText = new TextDecoder("utf-8").decode(csvBuf);
    console.log(`📄 Decompressed CSV: ${(csvText.length / 1024 / 1024).toFixed(2)} MB`);

    const rows = parseCSV(csvText);
    console.log(`🧮 Parsed ${rows.length} rows`);

    // Normalize and filter
    const deals: Record<string, any>[] = [];
    let skippedNoImage = 0, skippedNoPrice = 0, skippedOutOfStock = 0;

    for (const r of rows) {
      // Stock filter
      const inStock = (r.in_stock || "").trim();
      const stockStatus = (r.stock_status || "").toLowerCase();
      if (inStock === "0" || stockStatus === "out of stock" || stockStatus === "outofstock") {
        skippedOutOfStock++;
        continue;
      }

      // Image filter — prefer aw_image_url (HD), then large_image, then merchant_image_url
      const imageUrl = r.aw_image_url || r.large_image || r.merchant_image_url || "";
      if (!imageUrl || !imageUrl.startsWith("http")) { skippedNoImage++; continue; }

      // Price filter
      const salePrice = toNum(r.search_price);
      const originalPrice = toNum(r.rrp_price);
      if (!salePrice || salePrice <= 0) { skippedNoPrice++; continue; }

      // Compute discount
      let discount = toNum(r.savings_percent);
      if ((!discount || discount <= 0) && originalPrice && originalPrice > salePrice) {
        discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
      }
      discount = discount ?? 0;

      // Build canonical id (avoid collisions with other sources)
      const merchantId = r.merchant_id || "0";
      const productId = r.aw_product_id || r.merchant_product_id || "";
      if (!productId) continue;
      const id = `awin-${merchantId}-${productId}`;

      const merchant = (r.merchant_name || "").trim() || "Awin";
      const brand = cleanBrand(r.brand_name || "", merchant);
      const title = (r.product_name || "").trim();
      if (!title) continue;

      const category = inferCategory(r.merchant_category || r.category_name || "", title);
      const gender = inferGender("", title, r.description || "", r.merchant_category || "");
      const genderLabel = genderToLabel(gender);

      // Deal level
      let dealLevel = "promo-normale", flameCount = 1;
      if (discount >= 50) { dealLevel = "hot-deal"; flameCount = 3; }
      else if (discount >= 30) { dealLevel = "bon-deal"; flameCount = 2; }

      deals.push({
        id,
        title: title.slice(0, 500),
        brand,
        category,
        gender,
        gender_label: genderLabel,
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
    }

    console.log(`✅ Normalized ${deals.length} deals (skipped: ${skippedNoImage} no-image, ${skippedNoPrice} no-price, ${skippedOutOfStock} out-of-stock)`);

    // Upsert in batches of 500
    let upserted = 0;
    const batchSize = 500;
    for (let i = 0; i < deals.length; i += batchSize) {
      const batch = deals.slice(i, i + batchSize);
      const { error } = await supabase.from("deals").upsert(batch, { onConflict: "id" });
      if (error) {
        console.error(`Batch ${i / batchSize} error:`, error.message);
        throw error;
      }
      upserted += batch.length;
    }

    // Cleanup: delete awin-prefixed deals NOT in this import (stock removed)
    // (other sources are untouched)
    const importedIds = new Set(deals.map(d => d.id));
    let deleted = 0;
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await supabase
        .from("deals")
        .select("id")
        .like("id", "awin-%")
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

    const result = {
      success: true,
      total_rows: rows.length,
      imported: upserted,
      deleted_stale: deleted,
      skipped: { no_image: skippedNoImage, no_price: skippedNoPrice, out_of_stock: skippedOutOfStock },
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
