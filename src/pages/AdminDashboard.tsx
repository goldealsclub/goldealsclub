import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/lib/auth-context";
import { useGender } from "@/lib/gender-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  Loader2, TrendingUp, MousePointerClick, ShoppingBag, Heart, Users,
  Mail, Bell, ThumbsUp, Shield, CheckCircle, XCircle, Download,
  Eye, UserCheck, UserX, Activity, Star, Clock, Calendar,
  ExternalLink, Link2, RefreshCw, Download as DownloadIcon, AlertTriangle,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { TRACKED_CTAS, auditCta, getCtaAwinUrl } from "@/lib/tracked-ctas";
import PriceAuditTab from "@/components/admin/PriceAuditTab";

const COLORS = [
  "hsl(30,40%,45%)", "hsl(30,30%,55%)", "hsl(30,20%,65%)", "hsl(30,15%,72%)",
  "hsl(30,10%,78%)", "hsl(30,5%,84%)", "hsl(0,0%,88%)", "hsl(0,0%,92%)",
];

const EVENT_LABELS: Record<string, string> = {
  deal_view: "Vue produit",
  favorite_add: "Favori ajouté",
  favorite_remove: "Favori retiré",
  share_open: "Partage ouvert",
  share_action: "Partage cliqué",
  merchant_redirect: "Vers vendeur",
  promo_code_copy: "Code promo copié",
  compare_add: "Ajout au comparateur",
  search_query: "Recherche",
};

interface ClickStat {
  deal_id: string;
  deal_title: string | null;
  brand: string | null;
  category: string | null;
  merchant: string | null;
  click_count: number;
  first_click: string | null;
  last_click: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  confirmed: boolean;
  favorites_count: number;
  clicks_count: number;
  votes_count: number;
  roles: string[];
  alert_enabled: boolean;
  alert_frequency: string | null;
  phone: string | null;
  user_metadata: {
    full_name: string | null;
    avatar_url: string | null;
  };
  profile: {
    full_name: string | null;
    date_of_birth: string | null;
    city: string | null;
    country: string | null;
    clothing_size: string | null;
    shoe_size: string | null;
    preferred_brands: string[];
    bio: string | null;
    phone: string | null;
    gender: string | null;
    instagram_handle: string | null;
  } | null;
}

interface SiteStats {
  total_users: number;
  newsletter_subscribers: number;
  active_alerts: number;
  total_votes: number;
  total_clicks: number;
  total_favorites: number;
  total_deals: number;
  confirmed_users: number;
  unconfirmed_users: number;
  total_page_views: number;
  unique_sessions: number;
  total_events: number;
}

interface ChartData {
  signup_timeline: { date: string; count: number }[];
  click_timeline: { date: string; count: number }[];
  view_timeline: { date: string; count: number }[];
  provider_breakdown: { name: string; value: number }[];
  top_pages: { path: string; count: number }[];
  events_breakdown: { name: string; value: number }[];
  events_timeline: ({ date: string } & Record<string, number | string>)[];
  top_deals_by_event: Record<string, { deal_id: string; count: number }[]>;
}

type Tab = "overview" | "analytics" | "partners" | "awin" | "audit" | "users";

interface MerchantStat {
  merchant: string;
  deals_count: number;
  views: number;
  favorites: number;
  shares: number;
  promo_copies: number;
  redirects: number;
  outbound_clicks: number;
  ctr: number;
  conversion_rate: number;
}

const AdminDashboard = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { filteredDeals } = useGender();
  const [tab, setTab] = useState<Tab>("overview");
  const [clicks, setClicks] = useState<ClickStat[]>([]);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [clicksLoading, setClicksLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importingAwin, setImportingAwin] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const loadClicksData = () => {
    setClicksLoading(true);
    supabase
      .from("click_stats")
      .select("*")
      .order("click_count", { ascending: false })
      .then(({ data }) => {
        setClicks((data as ClickStat[]) || []);
        setClicksLoading(false);
      });
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalFavorites(count || 0));
  };

  const loadUsersData = async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const currentSession = session ?? (await supabase.auth.getSession()).data.session;
      const accessToken = currentSession?.access_token;

      if (!accessToken) {
        throw new Error("Session admin introuvable");
      }

      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {},
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (parsed?.error) {
        throw new Error(parsed.error);
      }

      setAdminUsers(Array.isArray(parsed?.users) ? parsed.users : []);
      setSiteStats(parsed?.stats || null);
      setCharts(parsed?.charts || null);
      setUsersLoaded(true);
    } catch (err) {
      console.error("[admin-users] load failed:", err);
      setAdminUsers([]);
      setSiteStats(null);
      setCharts(null);
      setUsersError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    loadClicksData();
    loadUsersData();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleImportAwin = async () => {
    if (importingAwin) return;
    setImportingAwin(true);
    toast.info("Import Awin lancé", {
      description: "Téléchargement des 4 flux marchands en cours (~3 minutes en arrière-plan).",
    });
    try {
      const { error } = await supabase.functions.invoke("import-awin-orchestrator", {
        body: { mode: "parallel" },
      });
      if (error) throw error;
      toast.success("Import Awin déclenché", {
        description: "Les 4 marchands sont en cours de traitement. Rafraîchis dans quelques minutes pour voir les nouveaux deals.",
      });
    } catch (err) {
      console.error("Awin import error:", err);
      toast.error("Échec du déclenchement", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setTimeout(() => setImportingAwin(false), 3000);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadClicksData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || usersLoaded) return;
    loadUsersData();
  }, [isAdmin, usersLoaded]);

  const totalClicks = useMemo(() => clicks.reduce((s, c) => s + c.click_count, 0), [clicks]);

  const clicksByBrand = useMemo(() => {
    const map: Record<string, number> = {};
    clicks.forEach((c) => { map[c.brand || "Inconnu"] = (map[c.brand || "Inconnu"] || 0) + c.click_count; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [clicks]);

  const clicksByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    clicks.forEach((c) => { map[c.category || "Autre"] = (map[c.category || "Autre"] || 0) + c.click_count; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [clicks]);

  const clicksByMerchant = useMemo(() => {
    const map: Record<string, number> = {};
    clicks.forEach((c) => { map[c.merchant || "Inconnu"] = (map[c.merchant || "Inconnu"] || 0) + c.click_count; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [clicks]);

  const dealsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDeals.forEach((d) => { map[d.category] = (map[d.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredDeals]);

  const dealsByBrand = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDeals.forEach((d) => { map[d.brand] = (map[d.brand] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [filteredDeals]);

  const topDeals = useMemo(() => clicks.slice(0, 10), [clicks]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Vue d'ensemble", icon: <Eye className="w-4 h-4" /> },
    { key: "analytics", label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "awin", label: "Awin Tracking", icon: <Link2 className="w-4 h-4" /> },
    { key: "audit", label: "Audit prix", icon: <AlertTriangle className="w-4 h-4" /> },
    { key: "users", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="font-display text-xl sm:text-3xl tracking-wider">ADMINISTRATION</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportAwin}
              disabled={importingAwin}
              title="Recharge les 4 flux marchands Awin (cron auto chaque jour à 3h)"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-foreground/10 text-[10px] sm:text-[11px] font-display uppercase tracking-widest text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
            >
              <DownloadIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${importingAwin ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">Import Awin</span>
              <span className="sm:hidden">Awin</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-foreground/10 text-[10px] sm:text-[11px] font-display uppercase tracking-widest text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Rafraîchir</span>
              <span className="sm:hidden">↻</span>
            </button>
          </div>
        </div>
        <p className="font-body text-[10px] sm:text-xs text-foreground/50 mb-6 sm:mb-8">Dashboard administrateur — données en temps réel</p>

        <div className="flex gap-0.5 sm:gap-1 mb-6 sm:mb-10 border-b border-foreground/8 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-display uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {t.icon}
              <span className="hidden xs:inline">{t.label}</span>
              <span className="xs:hidden">{t.key === "overview" ? "Vue" : t.key === "analytics" ? "Stats" : t.key === "awin" ? "Awin" : t.key === "audit" ? "Audit" : "Users"}</span>
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab
            stats={siteStats}
            charts={charts}
            users={adminUsers}
            totalClicks={totalClicks}
            totalFavorites={totalFavorites}
            dealsCount={filteredDeals.length}
            filteredDeals={filteredDeals}
            loading={usersLoading || clicksLoading}
          />
        )}

        {tab === "analytics" && (
          <AnalyticsTab
            filteredDeals={filteredDeals}
            totalClicks={totalClicks}
            totalFavorites={totalFavorites}
            clicks={clicks}
            clicksLoading={clicksLoading}
            clicksByBrand={clicksByBrand}
            clicksByCategory={clicksByCategory}
            clicksByMerchant={clicksByMerchant}
            dealsByCategory={dealsByCategory}
            dealsByBrand={dealsByBrand}
            topDeals={topDeals}
          />
        )}

        {tab === "awin" && (
          <AwinTab />
        )}

        {tab === "audit" && (
          <PriceAuditTab />
        )}

        {tab === "users" && (
          <UsersTab users={adminUsers} stats={siteStats} loading={usersLoading} error={usersError} />
        )}
      </div>
      <Footer />
    </div>
  );
};

/* ─── Overview Tab ─── */
const OverviewTab = ({ stats, charts, users, totalClicks, totalFavorites, dealsCount, filteredDeals, loading }: {
  stats: SiteStats | null;
  charts: ChartData | null;
  users: AdminUser[];
  totalClicks: number;
  totalFavorites: number;
  dealsCount: number;
  filteredDeals: any[];
  loading: boolean;
}) => {
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-foreground/30" /></div>;
  }

  const recentUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const activeUsers = users.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
  const topUsers = [...users].sort((a, b) => (b.clicks_count + b.favorites_count + b.votes_count) - (a.clicks_count + a.favorites_count + a.votes_count)).slice(0, 5);

  // Computed KPIs
  const avgClicksPerUser = users.length > 0 ? (totalClicks / users.length).toFixed(1) : "0";
  const avgFavsPerUser = users.length > 0 ? (totalFavorites / users.length).toFixed(1) : "0";
  const engagedUsers = users.filter((u) => u.clicks_count > 0 || u.favorites_count > 0 || u.votes_count > 0);
  const engagementRate = users.length > 0 ? ((engagedUsers.length / users.length) * 100).toFixed(1) : "0";
  const todayStr = new Date().toISOString().slice(0, 10);
  const signupsToday = users.filter((u) => u.created_at?.startsWith(todayStr)).length;
  const avgDiscount = filteredDeals.length > 0
    ? (filteredDeals.reduce((s, d) => s + (d.discount_percent || 0), 0) / filteredDeals.filter(d => d.discount_percent).length).toFixed(0)
    : "0";
  const superDeals = filteredDeals.filter((d) => d.is_super_deal).length;
  const highDiscount = filteredDeals.filter((d) => (d.discount_percent || 0) >= 40).length;
  const clickConversion = dealsCount > 0 ? ((totalClicks / dealsCount)).toFixed(1) : "0";

  return (
    <>
      {/* Traffic KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<Eye className="w-4 h-4 sm:w-5 sm:h-5" />} label="Pages vues" value={stats?.total_page_views || 0} accent="green" />
        <KpiCard icon={<Globe className="w-4 h-4 sm:w-5 sm:h-5" />} label="Visiteurs uniques" value={stats?.unique_sessions || 0} accent="green" />
        <KpiCard icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics sortants" value={stats?.total_clicks || totalClicks} />
        <KpiCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Taux clic" value={`${stats?.total_page_views ? ((stats.total_clicks / stats.total_page_views) * 100).toFixed(1) : "0"}%`} />
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} label="Utilisateurs" value={stats?.total_users || 0} />
        <KpiCard icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />} label="Deals actifs" value={dealsCount} />
        <KpiCard icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics totaux" value={stats?.total_clicks || totalClicks} />
        <KpiCard icon={<Heart className="w-4 h-4 sm:w-5 sm:h-5" />} label="Favoris totaux" value={stats?.total_favorites || totalFavorites} />
        <KpiCard icon={<ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Votes totaux" value={stats?.total_votes || 0} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />} label="Email confirmé" value={stats?.confirmed_users || 0} accent="green" />
        <KpiCard icon={<UserX className="w-4 h-4 sm:w-5 sm:h-5" />} label="Non confirmé" value={stats?.unconfirmed_users || 0} accent="red" />
        <KpiCard icon={<Mail className="w-4 h-4 sm:w-5 sm:h-5" />} label="Newsletter" value={stats?.newsletter_subscribers || 0} />
        <KpiCard icon={<Bell className="w-4 h-4 sm:w-5 sm:h-5" />} label="Alertes actives" value={stats?.active_alerts || 0} />
      </div>

      {/* Computed KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics / utilisateur" value={avgClicksPerUser} />
        <KpiCard icon={<Star className="w-4 h-4 sm:w-5 sm:h-5" />} label="Favoris / utilisateur" value={avgFavsPerUser} />
        <KpiCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Taux engagement" value={`${engagementRate}%`} accent="green" />
        <KpiCard icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5" />} label="Inscriptions auj." value={signupsToday} />
        <KpiCard icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics / deal" value={clickConversion} />
      </div>

      {/* Deal quality KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<Star className="w-4 h-4 sm:w-5 sm:h-5" />} label="Super deals" value={superDeals} accent="green" />
        <KpiCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Réduction moy." value={`${avgDiscount}%`} />
        <KpiCard icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />} label="Deals > 40% off" value={highDiscount} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
        {charts?.view_timeline && charts.view_timeline.length > 0 && (
          <ChartCard title="Pages vues (30 derniers jours)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.view_timeline}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(d) => format(new Date(d), "dd MMM yyyy", { locale: fr })} />
                <Area type="monotone" dataKey="count" stroke="hsl(140,30%,40%)" fill="hsl(140,30%,40%)" fillOpacity={0.15} name="Vues" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {charts?.top_pages && charts.top_pages.length > 0 && (
          <ChartCard title="Top pages visitées">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {charts.top_pages.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs gap-2">
                  <span className="truncate font-mono">{p.path || "/"}</span>
                  <span className="font-display tabular-nums">{p.count}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {charts?.signup_timeline && charts.signup_timeline.length > 0 && (
          <ChartCard title="Inscriptions (30 derniers jours)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.signup_timeline}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(d) => format(new Date(d), "dd MMM yyyy", { locale: fr })} />
                <Area type="monotone" dataKey="count" stroke="hsl(30,40%,45%)" fill="hsl(30,40%,45%)" fillOpacity={0.15} name="Inscriptions" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {charts?.click_timeline && charts.click_timeline.length > 0 && (
          <ChartCard title="Clics sortants (30 derniers jours)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.click_timeline}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(d) => format(new Date(d), "dd MMM yyyy", { locale: fr })} />
                <Area type="monotone" dataKey="count" stroke="hsl(30,30%,55%)" fill="hsl(30,30%,55%)" fillOpacity={0.15} name="Clics" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Événements clés */}
      {charts?.events_breakdown && charts.events_breakdown.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h3 className="text-xs sm:text-sm font-display uppercase tracking-[0.2em] text-foreground/60 mb-4">
            Événements clés ({stats?.total_events || 0} total)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6">
            {charts.events_breakdown.map((e) => (
              <KpiCard
                key={e.name}
                icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
                label={EVENT_LABELS[e.name] || e.name}
                value={e.value}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {charts.events_timeline && charts.events_timeline.length > 0 && (
              <ChartCard title="Timeline des événements (30j)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={charts.events_timeline}>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => String(d).slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(d) => format(new Date(d as string), "dd MMM yyyy", { locale: fr })} />
                    {charts.events_breakdown.slice(0, 6).map((e, i) => (
                      <Line
                        key={e.name}
                        type="monotone"
                        dataKey={e.name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                        name={EVENT_LABELS[e.name] || e.name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {charts.top_deals_by_event && Object.keys(charts.top_deals_by_event).length > 0 && (
              <ChartCard title="Top deals par événement">
                <div className="space-y-3 max-h-[220px] overflow-y-auto text-xs">
                  {Object.entries(charts.top_deals_by_event).map(([type, deals]) => (
                    <div key={type}>
                      <p className="font-display uppercase tracking-wider text-[10px] text-foreground/50 mb-1">
                        {EVENT_LABELS[type] || type}
                      </p>
                      {deals.map((d) => (
                        <div key={d.deal_id} className="flex justify-between items-center gap-2 pl-2">
                          <span className="truncate font-mono text-[10px]">{d.deal_id}</span>
                          <span className="font-display tabular-nums">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
        {charts?.provider_breakdown && (
          <ChartCard title="Méthodes d'inscription">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={charts.provider_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {charts.provider_breakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard title="Utilisateurs actifs (7j)">
          <div className="flex flex-col items-center justify-center h-[160px] sm:h-[180px]">
            <p className="font-display text-3xl sm:text-4xl tracking-wider">{activeUsers.length}</p>
            <p className="text-[10px] font-body text-foreground/40 mt-1">sur {users.length} inscrits</p>
            <div className="w-full mt-4 bg-foreground/5 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${users.length > 0 ? (activeUsers.length / users.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] font-body text-foreground/30 mt-1">
              {users.length > 0 ? ((activeUsers.length / users.length) * 100).toFixed(1) : 0}% de taux d'activité
            </p>
          </div>
        </ChartCard>

        {/* Recent signups */}
        <ChartCard title="Dernières inscriptions">
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {u.user_metadata.avatar_url ? (
                    <img src={u.user_metadata.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-display text-primary shrink-0">
                      {(u.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] sm:text-xs font-body truncate">{u.user_metadata.full_name || u.email}</span>
                </div>
                <span className="text-[9px] font-body text-foreground/30 whitespace-nowrap">
                  {format(new Date(u.created_at), "dd/MM", { locale: fr })}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-xs text-foreground/30">Aucun</p>}
          </div>
        </ChartCard>
      </div>

      {/* Top engaged users */}
      {topUsers.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h3 className="font-display text-xs sm:text-sm uppercase tracking-widest mb-3 sm:mb-4">Utilisateurs les plus engagés</h3>
          <div className="border border-foreground/8 overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs font-body">
              <thead>
                <tr className="border-b border-foreground/8 bg-muted/30">
                  <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Utilisateur</th>
                  <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Clics</th>
                  <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Favoris</th>
                  <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Votes</th>
                  <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Score</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr key={u.id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors">
                    <td className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                      {u.user_metadata.avatar_url ? (
                        <img src={u.user_metadata.avatar_url} className="w-5 h-5 rounded-full shrink-0" alt="" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-display text-primary shrink-0">
                          {(u.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">{u.email}</span>
                    </td>
                    <td className="p-2 sm:p-3 text-center">{u.clicks_count}</td>
                    <td className="p-2 sm:p-3 text-center">{u.favorites_count}</td>
                    <td className="p-2 sm:p-3 text-center hidden sm:table-cell">{u.votes_count}</td>
                    <td className="p-2 sm:p-3 text-center font-semibold">{u.clicks_count + u.favorites_count + u.votes_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

/* ─── Analytics Tab ─── */
const AnalyticsTab = ({
  filteredDeals, totalClicks, totalFavorites, clicks, clicksLoading,
  clicksByBrand, clicksByCategory, clicksByMerchant, dealsByCategory, dealsByBrand, topDeals,
}: any) => {
  const avgDiscount = filteredDeals.length > 0
    ? (filteredDeals.reduce((s: number, d: any) => s + (d.discount_percent || 0), 0) / filteredDeals.filter((d: any) => d.discount_percent).length).toFixed(0)
    : "0";
  const superDeals = filteredDeals.filter((d: any) => d.is_super_deal).length;
  const clicksPerDeal = filteredDeals.length > 0 ? (totalClicks / filteredDeals.length).toFixed(1) : "0";
  const favsPerDeal = filteredDeals.length > 0 ? (totalFavorites / filteredDeals.length).toFixed(2) : "0";

  return (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <KpiCard icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />} label="Deals actifs" value={filteredDeals.length} />
      <KpiCard icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics sortants" value={totalClicks} />
      <KpiCard icon={<Heart className="w-4 h-4 sm:w-5 sm:h-5" />} label="Favoris total" value={totalFavorites} />
      <KpiCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Deals cliqués" value={clicks.length} />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-8 sm:mb-12">
      <KpiCard icon={<Star className="w-4 h-4 sm:w-5 sm:h-5" />} label="Super deals" value={superDeals} accent="green" />
      <KpiCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="Réduction moy." value={`${avgDiscount}%`} />
      <KpiCard icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics / deal" value={clicksPerDeal} />
      <KpiCard icon={<Heart className="w-4 h-4 sm:w-5 sm:h-5" />} label="Favoris / deal" value={favsPerDeal} />
    </div>

    {clicksLoading ? (
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-foreground/30" /></div>
    ) : (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
          <ChartCard title="Clics par marque (top 10)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clicksByBrand} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={55} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="hsl(30,40%,45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Clics par catégorie">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={clicksByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {clicksByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
          <ChartCard title="Deals par marque (top 10)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dealsByBrand} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={55} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="hsl(30,30%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Deals par catégorie">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={dealsByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {dealsByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Clics par marchand">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clicksByMerchant}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" fill="hsl(30,20%,65%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="mt-8 sm:mt-12">
          <h3 className="font-display text-xs sm:text-sm uppercase tracking-widest mb-3 sm:mb-4">Top 10 deals les plus cliqués</h3>
          <div className="border border-foreground/8 overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs font-body">
              <thead>
                <tr className="border-b border-foreground/8 bg-muted/30">
                  <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">#</th>
                  <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Deal</th>
                  <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Marque</th>
                  <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden md:table-cell">Catégorie</th>
                  <th className="text-right p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Clics</th>
                  <th className="text-right p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Dernier clic</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((d: any, i: number) => (
                  <tr key={d.deal_id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors">
                    <td className="p-2 sm:p-3 text-foreground/40">{i + 1}</td>
                    <td className="p-2 sm:p-3 max-w-[140px] sm:max-w-[200px] truncate">{d.deal_title || d.deal_id}</td>
                    <td className="p-2 sm:p-3 text-foreground/60 hidden sm:table-cell">{d.brand || "—"}</td>
                    <td className="p-2 sm:p-3 text-foreground/60 hidden md:table-cell">{d.category || "—"}</td>
                    <td className="p-2 sm:p-3 text-right font-semibold">{d.click_count}</td>
                    <td className="p-2 sm:p-3 text-right text-foreground/40 hidden sm:table-cell">{d.last_click ? new Date(d.last_click).toLocaleDateString("fr-FR") : "—"}</td>
                  </tr>
                ))}
                {topDeals.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-foreground/30">Aucun clic enregistré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </>
  );
};

/* ─── Awin Tracking Tab ─── */
interface AwinClick {
  id: string;
  deal_id: string;
  destination_url: string | null;
  clicked_at: string;
  user_id: string | null;
  referrer: string | null;
  deal_title?: string;
  brand?: string;
  merchant?: string;
}

const AwinTab = () => {
  const [awinClicks, setAwinClicks] = useState<AwinClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    const fetchClicks = async () => {
      setLoading(true);
      let query = supabase
        .from("outbound_clicks")
        .select("*")
        .order("clicked_at", { ascending: false });

      if (period === "7d") {
        query = query.gte("clicked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (period === "30d") {
        query = query.gte("clicked_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }

      const { data: clicksData } = await query.limit(500);
      if (!clicksData) { setLoading(false); return; }

      // Enrich with deal info
      const dealIds = [...new Set(clicksData.map((c: any) => c.deal_id))];
      const { data: dealsData } = await supabase
        .from("deals")
        .select("id, title, brand, merchant")
        .in("id", dealIds);

      const dealsMap = new Map((dealsData || []).map((d: any) => [d.id, d]));
      const enriched = clicksData.map((c: any) => {
        const deal = dealsMap.get(c.deal_id);
        return { ...c, deal_title: deal?.title, brand: deal?.brand, merchant: deal?.merchant };
      });

      setAwinClicks(enriched);
      setLoading(false);
    };
    fetchClicks();
  }, [period]);

  const awinOnly = awinClicks.filter((c) => c.destination_url?.includes("awin"));
  const withClickref = awinOnly.filter((c) => c.destination_url?.includes("clickref"));
  const totalAwin = awinOnly.length;
  const totalAll = awinClicks.length;
  const awinRate = totalAll > 0 ? ((totalAwin / totalAll) * 100).toFixed(1) : "0";

  // Clicks by day for chart
  const clicksByDay = useMemo(() => {
    const map: Record<string, { total: number; awin: number }> = {};
    awinClicks.forEach((c) => {
      const day = c.clicked_at.slice(0, 10);
      if (!map[day]) map[day] = { total: 0, awin: 0 };
      map[day].total++;
      if (c.destination_url?.includes("awin")) map[day].awin++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, total: v.total, awin: v.awin }));
  }, [awinClicks]);

  // Top deals by Awin clicks
  const topAwinDeals = useMemo(() => {
    const map: Record<string, { title: string; brand: string; merchant: string; count: number }> = {};
    awinOnly.forEach((c) => {
      const key = c.deal_id;
      if (!map[key]) map[key] = { title: c.deal_title || c.deal_id, brand: c.brand || "—", merchant: c.merchant || "—", count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [awinOnly]);

  // Extract clickref from URL
  const extractClickref = (url: string | null): string => {
    if (!url) return "—";
    try {
      const u = new URL(url);
      return u.searchParams.get("clickref") || "—";
    } catch {
      return "—";
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-foreground/30" /></div>;
  }

  return (
    <>
      {/* Period selector */}
      <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8">
        {(["7d", "30d", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-display uppercase tracking-widest border transition-colors ${
              period === p ? "border-primary bg-primary/10 text-foreground" : "border-foreground/10 text-foreground/40 hover:text-foreground/70"
            }`}
          >
            {p === "7d" ? "7j" : p === "30d" ? "30j" : "Tout"}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <KpiCard icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics totaux" value={totalAll} />
        <KpiCard icon={<Link2 className="w-4 h-4 sm:w-5 sm:h-5" />} label="Clics Awin" value={totalAwin} />
        <KpiCard icon={<ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />} label="Avec clickref" value={withClickref.length} />
        <div className="border border-foreground/8 p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-foreground/40">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] sm:text-[10px] font-display uppercase tracking-widest">Taux Awin</span>
          </div>
          <p className="font-display text-lg sm:text-2xl tracking-wider">{awinRate}%</p>
        </div>
      </div>

      {/* Chart */}
      {clicksByDay.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
          <ChartCard title="Clics par jour (total vs Awin)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clicksByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(d) => format(new Date(d), "dd MMM yyyy", { locale: fr })} />
                <Bar dataKey="total" fill="hsl(30,15%,72%)" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="awin" fill="hsl(30,40%,45%)" name="Awin" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {topAwinDeals.length > 0 && (
            <ChartCard title="Top deals Awin (par clics)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topAwinDeals.slice(0, 8)} layout="vertical" margin={{ left: 70 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="title" type="category" tick={{ fontSize: 8 }} width={65} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(30,40%,45%)" radius={[0, 4, 4, 0]} name="Clics" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* Manual CTA registry — UTM/clickref consistency audit */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-baseline justify-between mb-3 sm:mb-4">
          <h3 className="font-display text-xs sm:text-sm uppercase tracking-widest">
            Registre des CTA trackés
          </h3>
          <span className="text-[9px] sm:text-[10px] font-body text-foreground/40">
            {TRACKED_CTAS.length} CTA · audit UTM & clickref
          </span>
        </div>
        <div className="border border-foreground/8 overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs font-body">
            <thead>
              <tr className="border-b border-foreground/8 bg-muted/30">
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">CTA</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden md:table-cell">Emplacement</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Campaign</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Source</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Medium</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Content</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Clickref</th>
                <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Statut</th>
                <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Lien</th>
              </tr>
            </thead>
            <tbody>
              {TRACKED_CTAS.map((cta) => {
                const issues = auditCta(cta);
                const ok = issues.length === 0;
                return (
                  <tr key={cta.id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors align-top">
                    <td className="p-2 sm:p-3 max-w-[180px]">
                      <div className="font-display text-[10px] sm:text-xs">{cta.label}</div>
                      <div className="font-mono text-[9px] text-foreground/40">{cta.id}</div>
                    </td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-foreground/50 hidden md:table-cell">{cta.location}</td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-primary">{cta.utm.campaign}</td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-foreground/60 hidden sm:table-cell">{cta.utm.source}</td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-foreground/60 hidden sm:table-cell">{cta.utm.medium}</td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-foreground/60">{cta.utm.content}</td>
                    <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-primary">{cta.clickref}</td>
                    <td className="p-2 sm:p-3 text-center">
                      {ok ? (
                        <span title="Cohérent" className="inline-flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span title={issues.join(" · ")} className="inline-flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          <XCircle className="w-3 h-3" /> {issues.length}
                        </span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <a
                        href={getCtaAwinUrl(cta)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
                        title="Tester le lien Awin"
                      >
                        <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] sm:text-[10px] font-body text-foreground/30 mt-2 sm:mt-3">
          Survolez le statut pour voir les détails. Source unique de vérité :{" "}
          <span className="font-mono">src/lib/tracked-ctas.ts</span>
        </p>
      </div>

      {/* Recent Awin clicks table */}
      <div className="mb-8 sm:mb-12">
        <h3 className="font-display text-xs sm:text-sm uppercase tracking-widest mb-3 sm:mb-4">Derniers clics Awin</h3>
        <div className="border border-foreground/8 overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs font-body">
            <thead>
              <tr className="border-b border-foreground/8 bg-muted/30">
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Date</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">Deal</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden sm:table-cell">Marque</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden md:table-cell">Marchand</th>
                <th className="text-left p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px] hidden lg:table-cell">Clickref</th>
                <th className="text-center p-2 sm:p-3 font-display uppercase tracking-wider text-[9px] sm:text-[10px]">User</th>
              </tr>
            </thead>
            <tbody>
              {awinOnly.slice(0, 50).map((c) => (
                <tr key={c.id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors">
                  <td className="p-2 sm:p-3 text-foreground/60 whitespace-nowrap">
                    {format(new Date(c.clicked_at), "dd/MM HH:mm", { locale: fr })}
                  </td>
                  <td className="p-2 sm:p-3 max-w-[120px] sm:max-w-[200px] truncate">{c.deal_title || c.deal_id}</td>
                  <td className="p-2 sm:p-3 text-foreground/60 hidden sm:table-cell">{c.brand || "—"}</td>
                  <td className="p-2 sm:p-3 text-foreground/60 hidden md:table-cell">{c.merchant || "—"}</td>
                  <td className="p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] text-primary max-w-[150px] truncate hidden lg:table-cell">{extractClickref(c.destination_url)}</td>
                  <td className="p-2 sm:p-3 text-center">
                    {c.user_id ? <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground/40 mx-auto" /> : <span className="text-foreground/20 text-[9px]">anon</span>}
                  </td>
                </tr>
              ))}
              {awinOnly.length === 0 && (
                <tr><td colSpan={6} className="p-6 sm:p-8 text-center text-foreground/30">Aucun clic Awin enregistré</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] sm:text-[10px] font-body text-foreground/30 mt-2 sm:mt-3">
          {awinOnly.length} clic{awinOnly.length > 1 ? "s" : ""} Awin — Conversions trackées via clickref dans votre dashboard Awin
        </p>
      </div>

      {/* Info box */}
      <div className="border border-foreground/8 bg-muted/20 p-4 sm:p-6">
        <h4 className="font-display text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">💡 Suivi des conversions</h4>
        <p className="text-[11px] sm:text-xs font-body text-foreground/60 leading-relaxed">
          Chaque clic sortant vers Awin contient un <span className="font-mono text-primary">clickref</span> unique.
          Connectez-vous à votre{" "}
          <a href="https://ui.awin.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            dashboard Awin
          </a>{" "}
          pour corréler les ventes avec vos deals.
        </p>
      </div>
    </>
  );
};

/* ─── Users Tab ─── */
const UsersTab = ({ users, stats, loading, error }: { users: AdminUser[]; stats: SiteStats | null; loading: boolean; error: string | null }) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "clicks" | "favorites" | "engagement">("date");

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        u.email?.toLowerCase().includes(q) ||
        u.provider.toLowerCase().includes(q) ||
        u.user_metadata.full_name?.toLowerCase().includes(q) ||
        u.roles.some((r) => r.includes(q))
      );
    }
    // Sort
    switch (sortBy) {
      case "clicks":
        return [...list].sort((a, b) => b.clicks_count - a.clicks_count);
      case "favorites":
        return [...list].sort((a, b) => b.favorites_count - a.favorites_count);
      case "engagement":
        return [...list].sort((a, b) => (b.clicks_count + b.favorites_count + b.votes_count) - (a.clicks_count + a.favorites_count + a.votes_count));
      default:
        return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [users, search, sortBy]);

  const exportCSV = () => {
    const header = "ID,Email,Nom,Date naissance,Genre,Ville,Pays,Téléphone,Instagram,Taille,Pointure,Marques,Bio,Provider,Confirmé,Rôles,Favoris,Clics,Votes,Alerte,Fréquence,Inscrit le,Dernière connexion\n";
    const rows = filtered.map((u) =>
      `"${u.id}","${u.email || ""}","${u.profile?.full_name || u.user_metadata.full_name || ""}","${u.profile?.date_of_birth || ""}","${u.profile?.gender || ""}","${u.profile?.city || ""}","${u.profile?.country || ""}","${u.profile?.phone || u.phone || ""}","${u.profile?.instagram_handle || ""}","${u.profile?.clothing_size || ""}","${u.profile?.shoe_size || ""}","${(u.profile?.preferred_brands || []).join("; ")}","${(u.profile?.bio || "").replace(/"/g, '""')}","${u.provider}","${u.confirmed ? "Oui" : "Non"}","${u.roles.join(", ") || "user"}","${u.favorites_count}","${u.clicks_count}","${u.votes_count}","${u.alert_enabled ? "Oui" : "Non"}","${u.alert_frequency || ""}","${u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : ""}","${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "Jamais"}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-foreground/30" /></div>;
  }

  if (error) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 p-6 text-sm text-foreground/70">
        <p className="font-display text-xs uppercase tracking-widest text-destructive mb-2">Erreur de chargement</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <KpiCard icon={<Users className="w-5 h-5" />} label="Utilisateurs inscrits" value={stats.total_users} />
          <KpiCard icon={<UserCheck className="w-5 h-5" />} label="Confirmés" value={stats.confirmed_users} accent="green" />
          <KpiCard icon={<Mail className="w-5 h-5" />} label="Newsletter" value={stats.newsletter_subscribers} />
          <KpiCard icon={<Bell className="w-5 h-5" />} label="Alertes actives" value={stats.active_alerts} />
        </div>
      )}

      {/* Search + Sort + Export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, nom, provider, rôle..."
          className="w-full max-w-md bg-muted/30 border border-foreground/10 px-4 py-2.5 text-xs font-body placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-muted/30 border border-foreground/10 px-3 py-2.5 text-xs font-body text-foreground/70 focus:outline-none"
        >
          <option value="date">Tri: Date</option>
          <option value="clicks">Tri: Clics</option>
          <option value="favorites">Tri: Favoris</option>
          <option value="engagement">Tri: Engagement</option>
        </select>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 border border-foreground/10 text-[11px] font-display uppercase tracking-widest text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter CSV
        </button>
      </div>

      {/* Users table */}
      <div className="border border-foreground/8 overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="border-b border-foreground/8 bg-muted/30">
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">#</th>
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Utilisateur</th>
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Provider</th>
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px] hidden lg:table-cell">Localisation</th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">Rôle</th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">Confirmé</th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">
                <Heart className="w-3 h-3 mx-auto" />
              </th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">
                <MousePointerClick className="w-3 h-3 mx-auto" />
              </th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">
                <ThumbsUp className="w-3 h-3 mx-auto" />
              </th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px] hidden lg:table-cell">Alerte</th>
              <th className="text-right p-3 font-display uppercase tracking-wider text-[10px] hidden xl:table-cell">ID</th>
              <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Inscrit le</th>
              <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Dernière co.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors align-top">
                <td className="p-3 text-foreground/40">{i + 1}</td>
                <td className="p-3">
                  <div className="flex items-start gap-2">
                    {u.user_metadata.avatar_url ? (
                      <img src={u.user_metadata.avatar_url} className="w-5 h-5 rounded-full mt-0.5 shrink-0" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-display text-primary mt-0.5 shrink-0">
                        {(u.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 space-y-0.5">
                      {u.user_metadata.full_name && (
                        <p className="text-[10px] text-foreground/50 truncate">{u.user_metadata.full_name}</p>
                      )}
                      <p className="truncate max-w-[220px]">{u.email || "—"}</p>
                      <p className="text-[10px] text-foreground/35 xl:hidden">ID: {u.id.slice(0, 8)}…</p>
                      {u.phone && <p className="text-[10px] text-foreground/35 lg:hidden">{u.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="space-y-0.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-foreground/60">
                      <Shield className="w-3 h-3" />
                      {u.provider}
                    </span>
                    {u.profile?.gender && u.profile.gender !== "non-précisé" && (
                      <p className="text-foreground/40">{u.profile.gender}</p>
                    )}
                    {u.profile?.date_of_birth && (
                      <p className="text-foreground/40">Né(e) {format(new Date(u.profile.date_of_birth), "dd/MM/yyyy")}</p>
                    )}
                    {(u.profile?.clothing_size || u.profile?.shoe_size) && (
                      <p className="text-foreground/40">
                        {u.profile.clothing_size ? `Taille: ${u.profile.clothing_size}` : ""}
                        {u.profile.shoe_size ? ` P: ${u.profile.shoe_size}` : ""}
                      </p>
                    )}
                    {u.profile?.instagram_handle && (
                      <p className="text-primary/70">{u.profile.instagram_handle}</p>
                    )}
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <div className="space-y-0.5 text-[10px]">
                    <p className="text-foreground/60">{[u.profile?.city, u.profile?.country].filter(Boolean).join(", ") || "—"}</p>
                    {(u.profile?.phone || u.phone) && <p className="text-foreground/40">{u.profile?.phone || u.phone}</p>}
                    {u.profile?.preferred_brands && u.profile.preferred_brands.length > 0 && (
                      <p className="text-foreground/40 truncate max-w-[180px]">♥ {u.profile.preferred_brands.join(", ")}</p>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center">
                  {u.roles.length > 0 ? (
                    u.roles.map((r) => (
                      <span key={r} className={`inline-block px-2 py-0.5 text-[9px] font-display uppercase tracking-widest ${
                        r === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-foreground/50"
                      }`}>
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-foreground/20 text-[9px]">user</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {u.confirmed
                    ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                    : <XCircle className="w-4 h-4 text-foreground/20 mx-auto" />
                  }
                </td>
                <td className="p-3 text-center">{u.favorites_count || <span className="text-foreground/15">0</span>}</td>
                <td className="p-3 text-center">{u.clicks_count || <span className="text-foreground/15">0</span>}</td>
                <td className="p-3 text-center">{u.votes_count || <span className="text-foreground/15">0</span>}</td>
                <td className="p-3 text-center hidden lg:table-cell">{u.alert_enabled ? (u.alert_frequency || "active") : "—"}</td>
                <td className="p-3 text-right text-foreground/40 hidden xl:table-cell font-mono text-[10px]">{u.id}</td>
                <td className="p-3 text-right text-foreground/60">
                  {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                </td>
                <td className="p-3 text-right text-foreground/40">
                  {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "dd MMM yyyy HH:mm", { locale: fr }) : "Jamais"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="p-8 text-center text-foreground/30">Aucun utilisateur trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-body text-foreground/30 mt-3">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
    </>
  );
};

/* ─── Shared Components ─── */
const KpiCard = ({ icon, label, value, accent, suffix }: { icon: React.ReactNode; label: string; value: number | string; accent?: "green" | "red"; suffix?: string }) => (
  <div className={`border p-3 sm:p-5 ${accent === "green" ? "border-green-500/20" : accent === "red" ? "border-red-500/20" : "border-foreground/8"}`}>
    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-foreground/40">
      {icon}
      <span className="text-[9px] sm:text-[10px] font-display uppercase tracking-widest leading-tight">{label}</span>
    </div>
    <p className={`font-display text-lg sm:text-2xl tracking-wider ${accent === "green" ? "text-green-600" : accent === "red" ? "text-red-500" : ""}`}>
      {typeof value === "number" ? value.toLocaleString("fr-FR") : value}{suffix && <span className="text-sm text-foreground/40 ml-0.5">{suffix}</span>}
    </p>
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-foreground/8 p-3 sm:p-6">
    <h3 className="font-display text-[10px] sm:text-xs uppercase tracking-widest text-foreground/50 mb-3 sm:mb-4">{title}</h3>
    {children}
  </div>
);

export default AdminDashboard;
