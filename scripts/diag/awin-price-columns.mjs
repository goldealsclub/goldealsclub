#!/usr/bin/env node
/** Diagnostic : colonnes de prix du flux Awin pour quelques produits (sans afficher la clé). */
import zlib from "zlib";
const KEY = process.env.AWIN_API_KEY;
const FIDS = (process.env.FIDS || "48225,87190,87833,90621,111256,112989").split(",");
const MATCH = new RegExp(process.env.MATCH || "PREDATOR ACCURACY\\.2|ULTRABOOST 20|CodeChaos 21|Copa PURE III PRO|X_PLRBOOST|Chuck Taylor ALL STAR Lift Hi", "i");
const COLS = ["merchant_name","product_name","aw_product_id","search_price","store_price","display_price","rrp_price","base_price",
  "product_price_old","saving","savings_percent","custom_1","custom_2","custom_3","custom_4","custom_5","merchant_deep_link"];
const parse = (line) => { const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  out.push(cur); return out; };
for (const fid of FIDS) {
  const url = `https://productdata.awin.com/datafeed/download/apikey/${KEY}/language/fr/fid/${fid}/rid/0/hasEnhancedFeeds/1/columns/${COLS.join(",")}/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/`;
  const r = await fetch(url);
  if (!r.ok) { console.log(`FID ${fid} : HTTP ${r.status}`); continue; }
  const text = zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8");
  const lines = text.split("\n"); const head = parse(lines[0]);
  let shown = 0; const merchants = new Set();
  for (const l of lines.slice(1)) {
    if (!l) continue; const row = parse(l); const o = Object.fromEntries(head.map((h, i) => [h, row[i]]));
    merchants.add(o.merchant_name);
    if (MATCH.test(o.product_name || "") && shown < 6) {
      shown++;
      console.log(`FID ${fid} | ` + COLS.filter((c) => c !== "merchant_deep_link").map((c) => `${c}=${(o[c] || "").slice(0, 60)}`).join(" | "));
    }
  }
  console.log(`FID ${fid} : ${lines.length - 1} lignes, marchands : ${[...merchants].slice(0, 3).join(", ")}`);
}
