// Génère 3 snapshots JSON quotidiens dans le bucket public `deals-snapshots`,
// utilisés comme fallback immédiat si la live function `deals-json` régresse.
//
// Fichiers produits :
//   - all.json       → catalogue complet (même format que deals-json)
//   - newest.json    → 200 deals les plus récents
//   - super.json     → super promos (is_super_deal OU discount ≥ 40%)
//
// Déclenché par cron quotidien (voir migration pg_cron) ou manuellement
// via POST /functions/v1/snapshot-deals.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BUCKET = "deals-snapshots";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Réutilise la live function pour garantir EXACTEMENT le même format
    // que celui consommé par le frontend (mêmes règles de dédup, fenêtre 30j,
    // PROTECTED_MERCHANTS, etc.). Single source of truth.
    const liveUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/deals-json`;
    const liveResp = await fetch(liveUrl, {
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
      },
    });
    if (!liveResp.ok) {
      throw new Error(`deals-json HTTP ${liveResp.status}`);
    }
    const all = (await liveResp.json()) as any[];
    if (!Array.isArray(all) || all.length === 0) {
      throw new Error("deals-json returned empty payload — refusing snapshot");
    }

    // Garde-fou anti-régression : refuse de remplacer un snapshot sain
    // par un snapshot qui aurait perdu trop de deals.
    const MIN_DEALS = 4000;
    if (all.length < MIN_DEALS) {
      throw new Error(
        `Live payload trop maigre (${all.length} < ${MIN_DEALS}), snapshot annulé`,
      );
    }

    // newest = top 200 par detected_at desc
    const newest = [...all]
      .sort((a, b) => {
        const da = new Date(a.detected_at || 0).getTime();
        const db = new Date(b.detected_at || 0).getTime();
        return db - da;
      })
      .slice(0, 200);

    // super = is_super_deal OR discount >= 40
    const superDeals = all.filter((d) => {
      if (d?.is_super_deal === true) return true;
      const pct = Number(d?.discount_percent);
      return Number.isFinite(pct) && pct >= 40;
    });

    const generatedAt = new Date().toISOString();

    const files: Array<{ name: string; payload: unknown }> = [
      { name: "all.json", payload: all },
      { name: "newest.json", payload: newest },
      { name: "super.json", payload: superDeals },
      {
        name: "manifest.json",
        payload: {
          generated_at: generatedAt,
          counts: {
            all: all.length,
            newest: newest.length,
            super: superDeals.length,
          },
        },
      },
    ];

    const results: Record<string, { size: number; ok: boolean; error?: string }> = {};

    for (const f of files) {
      const body = JSON.stringify(f.payload);
      const blob = new Blob([body], { type: "application/json" });
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(f.name, blob, {
          contentType: "application/json",
          cacheControl: "300",
          upsert: true,
        });
      results[f.name] = {
        size: body.length,
        ok: !error,
        error: error?.message,
      };
      if (error) console.error(`upload ${f.name} failed:`, error);
    }

    const anyFailed = Object.values(results).some((r) => !r.ok);

    return new Response(
      JSON.stringify({
        ok: !anyFailed,
        generated_at: generatedAt,
        counts: {
          all: all.length,
          newest: newest.length,
          super: superDeals.length,
        },
        files: results,
      }),
      {
        status: anyFailed ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("snapshot-deals failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
