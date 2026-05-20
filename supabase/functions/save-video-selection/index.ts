// Remplace la sélection d'une catégorie du brief du jour par une liste de deal_ids
// choisis manuellement dans l'admin. Vérifie le rôle admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LABELS: Record<string, string> = {
  sneakers: "SNEAKERS",
  vetements: "VÊTEMENTS",
  accessoires: "ACCESSOIRES",
};
const ORDER = ["sneakers", "vetements", "accessoires"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabaseAuth.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const category = String(body?.category || "").trim();
    const dealIds: string[] = Array.isArray(body?.dealIds) ? body.dealIds.slice(0, 8) : [];
    if (!LABELS[category]) {
      return new Response(JSON.stringify({ error: "Unknown category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (dealIds.length < 3) {
      return new Response(JSON.stringify({ error: "Au moins 3 produits requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deals, error: dErr } = await admin
      .from("deals")
      .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url")
      .in("id", dealIds);
    if (dErr) throw dErr;

    // Conserve l'ordre fourni par l'utilisateur
    const byId = new Map((deals || []).map((d: any) => [d.id, d]));
    const ordered = dealIds.map((id) => byId.get(id)).filter(Boolean);

    const map = (d: any) => {
      const sale = Number(d.sale_price) || 0;
      const disc = Number(d.discount_percent) || 0;
      const orig = d.original_price != null
        ? Number(d.original_price)
        : disc > 0 && sale > 0
          ? Math.round((sale / (1 - disc / 100)) * 100) / 100
          : sale;
      return {
        id: d.id,
        title: d.title,
        brand: d.brand,
        merchant: d.merchant,
        sale_price: sale,
        original_price: orig,
        discount_percent: disc,
        currency: d.currency || "EUR",
        image_url: d.image_url,
        url: d.affiliate_url || d.product_url,
      };
    };
    const newSelection = {
      type: "selection",
      category,
      label: LABELS[category],
      deals: ordered.map(map),
    };

    const briefDate = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin
      .from("daily_video_briefs").select("deals,caption,hashtags").eq("brief_date", briefDate).maybeSingle();
    const prev: any[] = Array.isArray(existing?.deals) ? (existing!.deals as any[]) : [];
    const merged = prev.filter((s: any) => s?.category !== category).concat([newSelection]);
    merged.sort((a: any, b: any) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

    const today = new Date();
    const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const caption =
      `✨ TOP DEALS — ${dateStr}\n\n` +
      merged.map((s: any) => `${s.label} : top ${s.deals.length} (${s.deals.map((d: any) => d.brand).join(" · ")})`).join("\n") +
      `\n\n👉 Tous les deals sur goldealsclub.com\n#GOLDEALSCLUB`;
    const hashtags = existing?.hashtags ||
      "#sneakers #streetwear #hype #jordan #yeezy #trapstar #corteiz #stussy " +
      "#dunk #travisscott #offwhite #newbalance #carhartt #palace #supreme " +
      "#deals #bonplan #goldealsclub #fyp #pourtoi";

    const { error: upErr } = await admin
      .from("daily_video_briefs")
      .upsert(
        { brief_date: briefDate, focus_brand: "TOP_SELECTION", deals: merged, caption, hashtags },
        { onConflict: "brief_date" },
      );
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, selection: newSelection }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("save-video-selection failed", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
