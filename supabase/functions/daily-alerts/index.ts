import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get deals from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newDeals, error: dealsError } = await supabase
      .from("deals")
      .select("*")
      .gte("created_at", since);

    if (dealsError) throw dealsError;
    if (!newDeals || newDeals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new deals in the last 24h", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get users with alerts enabled
    const { data: alertUsers, error: alertError } = await supabase
      .from("email_alert_preferences")
      .select("user_id")
      .eq("enabled", true);

    if (alertError) throw alertError;
    if (!alertUsers || alertUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with alerts enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;

    for (const alertUser of alertUsers) {
      // Get this user's favorite brands
      const { data: favs } = await supabase
        .from("favorites")
        .select("deal_id")
        .eq("user_id", alertUser.user_id);

      if (!favs || favs.length === 0) continue;

      // Get unique brands from favorites by matching deal IDs in the deals table
      const favDealIds = favs.map((f: any) => f.deal_id);
      const { data: favDeals } = await supabase
        .from("deals")
        .select("brand")
        .in("id", favDealIds);

      if (!favDeals || favDeals.length === 0) continue;

      const favBrands = [...new Set(favDeals.map((d: any) => d.brand.toLowerCase()))];

      // Filter new deals matching favorite brands
      const matchingDeals = newDeals.filter((d: any) =>
        favBrands.includes(d.brand.toLowerCase())
      );

      if (matchingDeals.length === 0) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(
        alertUser.user_id
      );

      if (!userData?.user?.email) continue;

      // Build email content
      const dealsList = matchingDeals
        .slice(0, 10)
        .map(
          (d: any) =>
            `• ${d.title} - ${d.brand}${d.sale_price ? ` — ${d.sale_price}€` : ""}${d.discount_percent ? ` (-${d.discount_percent}%)` : ""}`
        )
        .join("\n");

      const htmlDeals = matchingDeals
        .slice(0, 10)
        .map(
          (d: any) =>
            `<tr>
              <td style="padding:12px;border-bottom:1px solid #eee;">
                <strong>${d.title}</strong><br/>
                <span style="color:#666;">${d.brand}</span>
                ${d.sale_price ? `<br/><span style="color:#c8a94e;font-weight:bold;">${d.sale_price}€</span>` : ""}
                ${d.discount_percent ? `<span style="color:#e74c3c;margin-left:8px;">-${d.discount_percent}%</span>` : ""}
              </td>
            </tr>`
        )
        .join("");

      // Send email via Supabase (or log for now)
      console.log(
        `[daily-alerts] Would send to ${userData.user.email}: ${matchingDeals.length} deals from brands: ${favBrands.join(", ")}`
      );
      console.log(dealsList);

      // TODO: When email domain is configured, use the transactional email function
      // For now, we log the alerts

      emailsSent++;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${alertUsers.length} users, ${emailsSent} alerts prepared`,
        newDealsCount: newDeals.length,
        sent: emailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("daily-alerts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
