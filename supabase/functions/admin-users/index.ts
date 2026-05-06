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
      dealsMerchantResult,
      allClicksDealsResult,
    ] = await Promise.all([
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      supabase.from("email_alert_preferences").select("id", { count: "exact", head: true }).eq("enabled", true),
      supabase.from("deal_votes").select("id", { count: "exact", head: true }),
      supabase.from("outbound_clicks").select("id", { count: "exact", head: true }),
      supabase.from("favorites").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id", { count: "estimated", head: true }),
      supabase.from("favorites").select("user_id"),
      supabase.from("outbound_clicks").select("user_id"),
      supabase.from("deal_votes").select("user_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("outbound_clicks").select("clicked_at").order("clicked_at", { ascending: false }).limit(500),
      supabase.from("email_alert_preferences").select("user_id, enabled, frequency"),
      supabase.from("page_views").select("id", { count: "exact", head: true }),
      supabase.from("page_views").select("session_id", { count: "exact", head: true }),
      supabase.from("page_views").select("viewed_at, path, session_id, referrer, country, user_id").order("viewed_at", { ascending: false }).limit(10000),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("event_type, deal_id, created_at").order("created_at", { ascending: false }).limit(5000),
      // Limited to most recent 5000 deals to avoid statement timeout on 170k+ rows.
      supabase.from("deals").select("id, merchant, brand").order("detected_at", { ascending: false, nullsFirst: false }).limit(5000),
      supabase.from("outbound_clicks").select("deal_id"),
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

    // Aggregate events
    const totalEvents = eventsCountResult.count || 0;
    const recentEvents = recentEventsResult.data || [];
    const eventTypeCount: Record<string, number> = {};
    const eventByDay: Record<string, Record<string, number>> = {};
    const eventDealCount: Record<string, Record<string, number>> = {};
    const thirtyDaysAgoEv = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    (recentEvents as any[]).forEach((e) => {
      const t = e.event_type;
      eventTypeCount[t] = (eventTypeCount[t] || 0) + 1;
      const d = e.created_at?.slice(0, 10);
      if (d && new Date(d) >= thirtyDaysAgoEv) {
        eventByDay[d] = eventByDay[d] || {};
        eventByDay[d][t] = (eventByDay[d][t] || 0) + 1;
      }
      if (e.deal_id) {
        eventDealCount[t] = eventDealCount[t] || {};
        eventDealCount[t][e.deal_id] = (eventDealCount[t][e.deal_id] || 0) + 1;
      }
    });
    const eventsBreakdown = Object.entries(eventTypeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const eventsTimeline = Object.entries(eventByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, perType]) => ({ date, ...perType }));
    // Top 5 deals per event type
    const topDealsByEvent: Record<string, { deal_id: string; count: number }[]> = {};
    Object.entries(eventDealCount).forEach(([type, deals]) => {
      topDealsByEvent[type] = Object.entries(deals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([deal_id, count]) => ({ deal_id, count }));
    });

    // ===== Per-merchant aggregation =====
    const dealsMerchantList = (dealsMerchantResult?.data || []) as any[];
    const allClicksDeals = (allClicksDealsResult?.data || []) as any[];
    const dealToMerchant: Record<string, string> = {};
    const merchantDealCount: Record<string, number> = {};
    dealsMerchantList.forEach((d: any) => {
      const m = d.merchant || "Inconnu";
      dealToMerchant[d.id] = m;
      merchantDealCount[m] = (merchantDealCount[m] || 0) + 1;
    });

    const merchantClicks: Record<string, number> = {};
    allClicksDeals.forEach((c: any) => {
      const m = dealToMerchant[c.deal_id] || "Inconnu";
      merchantClicks[m] = (merchantClicks[m] || 0) + 1;
    });

    const merchantViews: Record<string, number> = {};
    const merchantRedirects: Record<string, number> = {};
    const merchantFavAdd: Record<string, number> = {};
    const merchantPromoCopy: Record<string, number> = {};
    const merchantShares: Record<string, number> = {};
    (recentEvents as any[]).forEach((e) => {
      if (!e.deal_id) return;
      const m = dealToMerchant[e.deal_id];
      if (!m) return;
      if (e.event_type === "deal_view") merchantViews[m] = (merchantViews[m] || 0) + 1;
      else if (e.event_type === "merchant_redirect") merchantRedirects[m] = (merchantRedirects[m] || 0) + 1;
      else if (e.event_type === "favorite_add") merchantFavAdd[m] = (merchantFavAdd[m] || 0) + 1;
      else if (e.event_type === "promo_code_copy") merchantPromoCopy[m] = (merchantPromoCopy[m] || 0) + 1;
      else if (e.event_type === "share_action") merchantShares[m] = (merchantShares[m] || 0) + 1;
    });

    const merchantNames = new Set<string>([
      ...Object.keys(merchantDealCount),
      ...Object.keys(merchantClicks),
      ...Object.keys(merchantViews),
      ...Object.keys(merchantRedirects),
    ]);

    const merchantStats = Array.from(merchantNames).map((m) => {
      const views = merchantViews[m] || 0;
      const redirects = merchantRedirects[m] || 0;
      const clicksTotal = merchantClicks[m] || 0;
      // Conversion rate: redirects / views (intent to leave the site)
      const conversionRate = views > 0 ? (redirects / views) * 100 : 0;
      // Click-through rate: outbound clicks / views
      const ctr = views > 0 ? (clicksTotal / views) * 100 : 0;
      return {
        merchant: m,
        deals_count: merchantDealCount[m] || 0,
        views,
        favorites: merchantFavAdd[m] || 0,
        shares: merchantShares[m] || 0,
        promo_copies: merchantPromoCopy[m] || 0,
        redirects,
        outbound_clicks: clicksTotal,
        ctr: Math.round(ctr * 10) / 10,
        conversion_rate: Math.round(conversionRate * 10) / 10,
      };
    }).sort((a, b) => b.outbound_clicks - a.outbound_clicks);

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

    // Classify a visit into a traffic source bucket
    const OWN_DOMAINS = ["goldealsclub.com", "goldealsclub.fr", "goldealsclub.lovable.app", "lovable.app"];
    const SOCIAL_HOSTS = ["instagram", "facebook", "fb.", "tiktok", "twitter", "x.com", "t.co", "youtube", "youtu.be", "linkedin", "pinterest", "reddit", "snapchat", "threads"];
    const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo", "yahoo.", "ecosia", "qwant", "yandex", "baidu", "brave"];
    const SOCIAL_UTM = ["instagram", "facebook", "tiktok", "twitter", "x", "youtube", "linkedin", "pinterest", "reddit", "snapchat", "social"];
    const NEWSLETTER_UTM = ["newsletter", "email", "mail", "mailchimp", "sendgrid", "alerts"];

    function classifySource(referrer: string | null, path: string | null): string {
      // utm_source from path query string
      let utmSource: string | null = null;
      if (path && path.includes("utm_source=")) {
        try {
          const qs = path.split("?")[1] || "";
          const params = new URLSearchParams(qs);
          utmSource = (params.get("utm_source") || "").toLowerCase();
        } catch { /* ignore */ }
      }
      if (utmSource) {
        if (NEWSLETTER_UTM.some((k) => utmSource!.includes(k))) return "Newsletter";
        if (SOCIAL_UTM.some((k) => utmSource === k || utmSource!.includes(k))) return "Réseaux sociaux";
        if (utmSource.includes("google") || utmSource.includes("bing")) return "Google / Search";
        return "Référent";
      }
      const ref = (referrer || "").toLowerCase().trim();
      if (!ref) return "Direct";
      let host = ref;
      try { host = new URL(ref).hostname.toLowerCase(); } catch { /* ignore */ }
      if (OWN_DOMAINS.some((d) => host.includes(d))) return "Direct";
      if (SOCIAL_HOSTS.some((h) => host.includes(h))) return "Réseaux sociaux";
      if (SEARCH_HOSTS.some((h) => host.includes(h))) return "Google / Search";
      return "Référent";
    }

    // Page views aggregations.
    // Robust unique visitor key: user_id when available, otherwise session_id.
    // Track method usage so the dashboard can display it.
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const viewsByDay: Record<string, number> = {};
    const pathCount: Record<string, number> = {};
    const visitorsByDay: Record<string, Set<string>> = {};
    const sourceCount: Record<string, number> = {};
    const sourceByDay: Record<string, Record<string, number>> = {};
    const sourceVisitors: Record<string, Set<string>> = {};
    const countryCount: Record<string, number> = {};
    const countryVisitors: Record<string, Set<string>> = {};
    let methodUserId = 0;
    let methodSession = 0;
    let methodNone = 0;

    (recentPageViews || []).forEach((v: any) => {
      const d = v.viewed_at?.slice(0, 10);
      const visitorKey: string | null = v.user_id || v.session_id || null;
      if (v.user_id) methodUserId++;
      else if (v.session_id) methodSession++;
      else methodNone++;

      const src = classifySource(v.referrer, v.path);
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      if (visitorKey) {
        if (!sourceVisitors[src]) sourceVisitors[src] = new Set();
        sourceVisitors[src].add(visitorKey);
      }

      const country = (v.country || "??").toUpperCase().slice(0, 2);
      countryCount[country] = (countryCount[country] || 0) + 1;
      if (visitorKey) {
        if (!countryVisitors[country]) countryVisitors[country] = new Set();
        countryVisitors[country].add(visitorKey);
      }

      if (d && new Date(d) >= ninetyDaysAgo) {
        viewsByDay[d] = (viewsByDay[d] || 0) + 1;
        if (visitorKey) {
          if (!visitorsByDay[d]) visitorsByDay[d] = new Set();
          visitorsByDay[d].add(visitorKey);
        }
        if (new Date(d) >= thirtyDaysAgo) {
          sourceByDay[d] = sourceByDay[d] || {};
          sourceByDay[d][src] = (sourceByDay[d][src] || 0) + 1;
        }
      }
      if (v.path) {
        const cleanPath = v.path.split("?")[0];
        pathCount[cleanPath] = (pathCount[cleanPath] || 0) + 1;
      }
    });
    const trafficSourcesBreakdown = Object.entries(sourceCount)
      .map(([name, value]) => ({ name, value, unique_visitors: sourceVisitors[name]?.size || 0 }))
      .sort((a, b) => b.value - a.value);
    const trafficSourcesTimeline = Object.entries(sourceByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, perSource]) => ({ date, ...perSource }));
    const viewTimeline = Object.entries(viewsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    const uniqueVisitorsTimeline = Object.entries(visitorsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => ({ date, count: set.size }));
    const topPages = Object.entries(pathCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));
    const countryBreakdown = Object.entries(countryCount)
      .map(([code, views]) => ({
        code,
        views,
        unique_visitors: countryVisitors[code]?.size || 0,
      }))
      .sort((a, b) => b.unique_visitors - a.unique_visitors)
      .slice(0, 10);
    const totalMethod = methodUserId + methodSession + methodNone;
    const visitorMethod = {
      total: totalMethod,
      by_user_id: methodUserId,
      by_session_id: methodSession,
      unidentified: methodNone,
      coverage_pct: totalMethod > 0 ? Math.round(((methodUserId + methodSession) / totalMethod) * 1000) / 10 : 0,
      user_id_share_pct: totalMethod > 0 ? Math.round((methodUserId / totalMethod) * 1000) / 10 : 0,
    };

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
          total_events: totalEvents,
        },
        charts: {
          signup_timeline: signupTimeline,
          click_timeline: clickTimeline,
          view_timeline: viewTimeline,
          unique_visitors_timeline: uniqueVisitorsTimeline,
          traffic_sources_breakdown: trafficSourcesBreakdown,
          traffic_sources_timeline: trafficSourcesTimeline,
          provider_breakdown: providerBreakdown,
          top_pages: topPages,
          events_breakdown: eventsBreakdown,
          events_timeline: eventsTimeline,
          top_deals_by_event: topDealsByEvent,
          country_breakdown: countryBreakdown,
          visitor_method: visitorMethod,
        },
        merchant_stats: merchantStats,
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
