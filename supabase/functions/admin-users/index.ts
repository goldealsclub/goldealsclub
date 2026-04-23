import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    // Fetch all users from auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (error) throw error;

    // Fetch all data in parallel
    const [
      newsletterResult,
      alertResult,
      votesResult,
      totalClicksResult,
      totalFavoritesResult,
      totalDealsResult,
      favoritesResult,
      clicksResult,
      votesPerUserResult,
      rolesResult,
      recentClicksResult,
      alertPrefsResult,
      pageViewsCountResult,
      pageViewsSessionsResult,
      recentPageViewsResult,
      eventsCountResult,
      recentEventsResult,
    ] = await Promise.all([
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      supabase.from("email_alert_preferences").select("id", { count: "exact", head: true }).eq("enabled", true),
      supabase.from("deal_votes").select("id", { count: "exact", head: true }),
      supabase.from("outbound_clicks").select("id", { count: "exact", head: true }),
      supabase.from("favorites").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id", { count: "exact", head: true }),
      supabase.from("favorites").select("user_id"),
      supabase.from("outbound_clicks").select("user_id"),
      supabase.from("deal_votes").select("user_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("outbound_clicks").select("clicked_at").order("clicked_at", { ascending: false }).limit(500),
      supabase.from("email_alert_preferences").select("user_id, enabled, frequency"),
      supabase.from("page_views").select("id", { count: "exact", head: true }),
      supabase.from("page_views").select("session_id", { count: "exact", head: true }),
      supabase.from("page_views").select("viewed_at, path, session_id").order("viewed_at", { ascending: false }).limit(5000),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("event_type, deal_id, created_at").order("created_at", { ascending: false }).limit(5000),
    ]);

    // Fetch profiles
    const { data: profilesData } = await supabase.from("profiles").select("*");
    const profileMap: Record<string, any> = {};
    (profilesData || []).forEach((p: any) => {
      profileMap[p.user_id] = p;
    });

    const queryErrors = [
      newsletterResult.error,
      alertResult.error,
      votesResult.error,
      totalClicksResult.error,
      totalFavoritesResult.error,
      totalDealsResult.error,
      favoritesResult.error,
      clicksResult.error,
      votesPerUserResult.error,
      rolesResult.error,
      recentClicksResult.error,
      alertPrefsResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      throw queryErrors[0];
    }

    const newsletterCount = newsletterResult.count || 0;
    const alertCount = alertResult.count || 0;
    const votesCount = votesResult.count || 0;
    const totalClicks = totalClicksResult.count || 0;
    const totalFavorites = totalFavoritesResult.count || 0;
    const totalDeals = totalDealsResult.count || 0;
    const favoritesPerUser = favoritesResult.data || [];
    const clicksPerUser = clicksResult.data || [];
    const votesPerUser = votesPerUserResult.data || [];
    const allRoles = rolesResult.data || [];
    const recentClicks = recentClicksResult.data || [];
    const alertPrefs = alertPrefsResult.data || [];
    const totalPageViews = pageViewsCountResult.count || 0;
    const recentPageViews = recentPageViewsResult.data || [];
    const uniqueSessionsSet = new Set<string>();
    recentPageViews.forEach((v: any) => v.session_id && uniqueSessionsSet.add(v.session_id));

    // Build per-user maps
    const favCountMap: Record<string, number> = {};
    (favoritesPerUser || []).forEach((f: any) => {
      favCountMap[f.user_id] = (favCountMap[f.user_id] || 0) + 1;
    });

    const clickCountMap: Record<string, number> = {};
    (clicksPerUser || []).forEach((c: any) => {
      if (c.user_id) clickCountMap[c.user_id] = (clickCountMap[c.user_id] || 0) + 1;
    });

    const voteCountMap: Record<string, number> = {};
    (votesPerUser || []).forEach((v: any) => {
      voteCountMap[v.user_id] = (voteCountMap[v.user_id] || 0) + 1;
    });

    const roleMap: Record<string, string[]> = {};
    (allRoles || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    const alertMap: Record<string, { enabled: boolean; frequency: string }> = {};
    (alertPrefs || []).forEach((a: any) => {
      alertMap[a.user_id] = { enabled: a.enabled, frequency: a.frequency || "daily" };
    });

    // Signups over time (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const signupsByDay: Record<string, number> = {};
    (users || []).forEach((u) => {
      const d = u.created_at?.slice(0, 10);
      if (d && new Date(d) >= thirtyDaysAgo) {
        signupsByDay[d] = (signupsByDay[d] || 0) + 1;
      }
    });
    const signupTimeline = Object.entries(signupsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Clicks over last 30 days
    const clicksByDay: Record<string, number> = {};
    (recentClicks || []).forEach((c: any) => {
      const d = c.clicked_at?.slice(0, 10);
      if (d && new Date(d) >= thirtyDaysAgo) {
        clicksByDay[d] = (clicksByDay[d] || 0) + 1;
      }
    });
    const clickTimeline = Object.entries(clicksByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Page views over last 30 days + top pages
    const viewsByDay: Record<string, number> = {};
    const pathCount: Record<string, number> = {};
    (recentPageViews || []).forEach((v: any) => {
      const d = v.viewed_at?.slice(0, 10);
      if (d && new Date(d) >= thirtyDaysAgo) {
        viewsByDay[d] = (viewsByDay[d] || 0) + 1;
      }
      if (v.path) pathCount[v.path] = (pathCount[v.path] || 0) + 1;
    });
    const viewTimeline = Object.entries(viewsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    const topPages = Object.entries(pathCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Provider breakdown
    const providerCount: Record<string, number> = {};
    (users || []).forEach((u) => {
      const p = u.app_metadata?.provider || "email";
      providerCount[p] = (providerCount[p] || 0) + 1;
    });
    const providerBreakdown = Object.entries(providerCount).map(([name, value]) => ({ name, value }));

    // Confirmed vs unconfirmed
    let confirmedCount = 0;
    let unconfirmedCount = 0;
    (users || []).forEach((u) => {
      if (u.email_confirmed_at) confirmedCount++;
      else unconfirmedCount++;
    });

    // Map users to enriched format
    const safeUsers = (users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      provider: u.app_metadata?.provider || "email",
      confirmed: !!u.email_confirmed_at,
      favorites_count: favCountMap[u.id] || 0,
      clicks_count: clickCountMap[u.id] || 0,
      votes_count: voteCountMap[u.id] || 0,
      roles: roleMap[u.id] || [],
      alert_enabled: alertMap[u.id]?.enabled || false,
      alert_frequency: alertMap[u.id]?.frequency || null,
      phone: u.phone || null,
      user_metadata: {
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        avatar_url: u.user_metadata?.avatar_url || null,
      },
      profile: profileMap[u.id] ? {
        full_name: profileMap[u.id].full_name || null,
        date_of_birth: profileMap[u.id].date_of_birth || null,
        city: profileMap[u.id].city || null,
        country: profileMap[u.id].country || null,
        clothing_size: profileMap[u.id].clothing_size || null,
        shoe_size: profileMap[u.id].shoe_size || null,
        preferred_brands: profileMap[u.id].preferred_brands || [],
        bio: profileMap[u.id].bio || null,
        phone: profileMap[u.id].phone || null,
        gender: profileMap[u.id].gender || null,
        instagram_handle: profileMap[u.id].instagram_handle || null,
      } : null,
    }));

    return new Response(
      JSON.stringify({
        users: safeUsers,
        stats: {
          total_users: safeUsers.length,
          newsletter_subscribers: newsletterCount || 0,
          active_alerts: alertCount || 0,
          total_votes: votesCount || 0,
          total_clicks: totalClicks || 0,
          total_favorites: totalFavorites || 0,
          total_deals: totalDeals || 0,
          confirmed_users: confirmedCount,
          unconfirmed_users: unconfirmedCount,
          total_page_views: totalPageViews,
          unique_sessions: uniqueSessionsSet.size,
        },
        charts: {
          signup_timeline: signupTimeline,
          click_timeline: clickTimeline,
          view_timeline: viewTimeline,
          provider_breakdown: providerBreakdown,
          top_pages: topPages,
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error("admin-users failed", err);

    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
