import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/lib/auth-context";
import { useGender } from "@/lib/gender-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, MousePointerClick, ShoppingBag, Heart, Users, Mail, Bell, ThumbsUp, Shield, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["hsl(30,40%,45%)", "hsl(30,30%,55%)", "hsl(30,20%,65%)", "hsl(30,15%,72%)", "hsl(30,10%,78%)", "hsl(30,5%,84%)", "hsl(0,0%,88%)", "hsl(0,0%,92%)"];

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
}

interface SiteStats {
  total_users: number;
  newsletter_subscribers: number;
  active_alerts: number;
  total_votes: number;
}

type Tab = "analytics" | "users";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { filteredDeals } = useGender();
  const [tab, setTab] = useState<Tab>("analytics");
  const [clicks, setClicks] = useState<ClickStat[]>([]);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [clicksLoading, setClicksLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

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
  }, [isAdmin]);

  // Load users when tab switches
  useEffect(() => {
    if (tab !== "users" || !isAdmin || adminUsers.length > 0) return;
    setUsersLoading(true);
    supabase.functions
      .invoke("admin-users")
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load users:", error);
        } else if (data) {
          setAdminUsers(data.users || []);
          setSiteStats(data.stats || null);
        }
        setUsersLoading(false);
      });
  }, [tab, isAdmin]);

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

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "analytics", label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "users", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl tracking-wider mb-2">ADMINISTRATION</h1>
        <p className="font-body text-xs text-foreground/50 mb-8">Dashboard administrateur — données en temps réel</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-10 border-b border-foreground/8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-[11px] font-display uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

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

        {tab === "users" && (
          <UsersTab
            users={adminUsers}
            stats={siteStats}
            loading={usersLoading}
          />
        )}
      </div>
      <Footer />
    </div>
  );
};

/* ─── Analytics Tab ─── */
const AnalyticsTab = ({
  filteredDeals, totalClicks, totalFavorites, clicks, clicksLoading,
  clicksByBrand, clicksByCategory, clicksByMerchant, dealsByCategory, dealsByBrand, topDeals,
}: any) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <KpiCard icon={<ShoppingBag className="w-5 h-5" />} label="Deals actifs" value={filteredDeals.length} />
      <KpiCard icon={<MousePointerClick className="w-5 h-5" />} label="Clics sortants" value={totalClicks} />
      <KpiCard icon={<Heart className="w-5 h-5" />} label="Favoris total" value={totalFavorites} />
      <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Deals cliqués" value={clicks.length} />
    </div>

    {clicksLoading ? (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/30" />
      </div>
    ) : (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ChartCard title="Clics par marque (top 10)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clicksByBrand} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="hsl(30,40%,45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Clics par catégorie">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={clicksByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {clicksByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ChartCard title="Deals par marque (top 10)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealsByBrand} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="hsl(30,30%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Deals par catégorie">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dealsByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {dealsByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Clics par marchand">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={clicksByMerchant}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" fill="hsl(30,20%,65%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="mt-12">
          <h3 className="font-display text-sm uppercase tracking-widest mb-4">Top 10 deals les plus cliqués</h3>
          <div className="border border-foreground/8 overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="border-b border-foreground/8 bg-muted/30">
                  <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">#</th>
                  <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Deal</th>
                  <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Marque</th>
                  <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Catégorie</th>
                  <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Clics</th>
                  <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Dernier clic</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((d: any, i: number) => (
                  <tr key={d.deal_id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors">
                    <td className="p-3 text-foreground/40">{i + 1}</td>
                    <td className="p-3 max-w-[200px] truncate">{d.deal_title || d.deal_id}</td>
                    <td className="p-3 text-foreground/60">{d.brand || "—"}</td>
                    <td className="p-3 text-foreground/60">{d.category || "—"}</td>
                    <td className="p-3 text-right font-semibold">{d.click_count}</td>
                    <td className="p-3 text-right text-foreground/40">{d.last_click ? new Date(d.last_click).toLocaleDateString("fr-FR") : "—"}</td>
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

/* ─── Users Tab ─── */
const UsersTab = ({ users, stats, loading }: { users: AdminUser[]; stats: SiteStats | null; loading: boolean }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.email?.toLowerCase().includes(q) || u.provider.toLowerCase().includes(q));
  }, [users, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/30" />
      </div>
    );
  }

  return (
    <>
      {/* Site-wide KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <KpiCard icon={<Users className="w-5 h-5" />} label="Utilisateurs inscrits" value={stats.total_users} />
          <KpiCard icon={<Mail className="w-5 h-5" />} label="Abonnés newsletter" value={stats.newsletter_subscribers} />
          <KpiCard icon={<Bell className="w-5 h-5" />} label="Alertes actives" value={stats.active_alerts} />
          <KpiCard icon={<ThumbsUp className="w-5 h-5" />} label="Votes total" value={stats.total_votes} />
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email ou provider..."
          className="w-full max-w-md bg-muted/30 border border-foreground/10 px-4 py-2.5 text-xs font-body placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30"
        />
      </div>

      {/* Users table */}
      <div className="border border-foreground/8 overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="border-b border-foreground/8 bg-muted/30">
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">#</th>
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Email</th>
              <th className="text-left p-3 font-display uppercase tracking-wider text-[10px]">Provider</th>
              <th className="text-center p-3 font-display uppercase tracking-wider text-[10px]">Confirmé</th>
              <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Inscrit le</th>
              <th className="text-right p-3 font-display uppercase tracking-wider text-[10px]">Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className="border-b border-foreground/5 hover:bg-accent/20 transition-colors">
                <td className="p-3 text-foreground/40">{i + 1}</td>
                <td className="p-3">{u.email || "—"}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-foreground/60">
                    <Shield className="w-3 h-3" />
                    {u.provider}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {u.confirmed
                    ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                    : <XCircle className="w-4 h-4 text-foreground/20 mx-auto" />
                  }
                </td>
                <td className="p-3 text-right text-foreground/60">
                  {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                </td>
                <td className="p-3 text-right text-foreground/40">
                  {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "dd MMM yyyy HH:mm", { locale: fr }) : "Jamais"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-foreground/30">Aucun utilisateur trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-body text-foreground/30 mt-3">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
    </>
  );
};

const KpiCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="border border-foreground/8 p-5">
    <div className="flex items-center gap-2 mb-2 text-foreground/40">{icon}<span className="text-[10px] font-display uppercase tracking-widest">{label}</span></div>
    <p className="font-display text-2xl tracking-wider">{value.toLocaleString("fr-FR")}</p>
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-foreground/8 p-6">
    <h3 className="font-display text-xs uppercase tracking-widest text-foreground/50 mb-4">{title}</h3>
    {children}
  </div>
);

export default AdminDashboard;
