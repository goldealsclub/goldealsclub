import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_GENDERS = ["homme", "femme", "enfant", "unisexe"] as const;
const VALID_CATEGORIES = [
  "sneakers",
  "vestes",
  "hoodies",
  "t-shirts",
  "pantalons",
  "accessoires",
  "autres",
] as const;

function genderToLabel(g: string): string {
  switch (g) {
    case "homme": return "Homme";
    case "femme": return "Femme";
    case "enfant": return "Enfant";
    case "unisexe": return "Unisexe";
    default: return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get params: batch_size, offset, only_ambiguous (default true)
    const { batch_size = 20, offset = 0, only_ambiguous = true } = await req.json();

    // Fetch deals to classify - target ambiguous ones (autres/unisexe) by default
    let query = supabase
      .from("deals")
      .select("id, title, image_url, gender, category, brand, description")
      .not("image_url", "is", null)
      .neq("image_url", "");

    if (only_ambiguous) {
      query = query.or("category.eq.autres,gender.eq.unisexe");
    }

    const { data: deals, error: fetchErr } = await query
      .order("detected_at", { ascending: false })
      .range(offset, offset + batch_size - 1);

    if (fetchErr) throw fetchErr;
    if (!deals || deals.length === 0) {
      return new Response(JSON.stringify({ done: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const results: any[] = [];

    for (const deal of deals) {
      try {
        // Call Gemini with the product image
        const aiResp = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Tu es un expert en classification de vêtements streetwear/sportswear. 
Analyse l'image du produit et son titre pour déterminer:
1. Le GENRE cible: homme, femme, enfant, ou unisexe
   - Regarde le mannequin sur l'image: un enfant = "enfant", une femme = "femme", un homme = "homme"
   - Si pas de mannequin visible ou produit clairement mixte = "unisexe"
   - Les coupes féminines (crop top, bra, legging taille haute, wide leg) = "femme"
   - Les survêtements/ensembles enfants = "enfant"
2. La CATÉGORIE: sneakers, vestes, hoodies, t-shirts, pantalons, accessoires
   - sneakers = chaussures, baskets, slides, sandales
   - vestes = jacket, coat, blouson, doudoune, gilet, veste, survetement complet (haut+bas ensemble)
   - hoodies = sweatshirt, pull, hoodie, fleece top, zip top
   - t-shirts = t-shirt, polo, jersey, maillot, débardeur, chemise, tank top, crop top
   - pantalons = pantalon, jean, jogger, short, legging, bermuda
   - accessoires = casquette, sac, chaussette, bonnet, ceinture, écharpe, gant, sous-vêtement

Réponds UNIQUEMENT en JSON: {"gender":"...","category":"..."}`,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Titre: "${deal.title}"\nMarque: ${deal.brand}\nDescription: ${deal.description || "N/A"}`,
                    },
                    {
                      type: "image_url",
                      image_url: { url: deal.image_url },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!aiResp.ok) {
          if (aiResp.status === 429) {
            // Rate limited - wait and skip
            await new Promise((r) => setTimeout(r, 5000));
            results.push({ id: deal.id, skipped: true, reason: "rate_limit" });
            continue;
          }
          results.push({ id: deal.id, skipped: true, reason: `ai_error_${aiResp.status}` });
          continue;
        }

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from AI response
        const jsonMatch = content.match(/\{[^}]+\}/);
        if (!jsonMatch) {
          results.push({ id: deal.id, skipped: true, reason: "no_json" });
          continue;
        }

        const classification = JSON.parse(jsonMatch[0]);
        const newGender = VALID_GENDERS.includes(classification.gender)
          ? classification.gender
          : deal.gender;
        const newCategory = VALID_CATEGORIES.includes(classification.category)
          ? classification.category
          : deal.category;

        // Only update if something changed
        if (newGender !== deal.gender || newCategory !== deal.category) {
          const { error: updateErr } = await supabase
            .from("deals")
            .update({
              gender: newGender,
              gender_label: genderToLabel(newGender),
              category: newCategory,
            })
            .eq("id", deal.id);

          if (!updateErr) {
            updated++;
            results.push({
              id: deal.id,
              title: deal.title,
              old: { gender: deal.gender, category: deal.category },
              new: { gender: newGender, category: newCategory },
            });
          }
        } else {
          results.push({ id: deal.id, unchanged: true });
        }

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (dealErr) {
        results.push({ id: deal.id, error: String(dealErr) });
      }
    }

    return new Response(
      JSON.stringify({
        done: deals.length < batch_size,
        processed: deals.length,
        updated,
        next_offset: offset + batch_size,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("classify-deals error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
