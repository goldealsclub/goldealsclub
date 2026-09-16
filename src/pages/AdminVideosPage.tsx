import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import VideoHistory from "@/components/admin/VideoHistory";
import { renderStyleVideo } from "@/lib/video/render";
import type { BgPreset, Brief } from "@/pages/AdminVideoPage";
import {
  ArrowLeft,
  Clapperboard,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

const STYLES: { id: BgPreset; label: string; hint: string }[] = [
  { id: "adidas", label: "Adidas", hint: "Géométrique & graphique" },
  { id: "zara", label: "Zara", hint: "Studio éditorial clair" },
  { id: "nike", label: "Nike", hint: "Athlétique, accent orange" },
];

type VideoRow = {
  id: string;
  brief_date: string;
  category: string;
  label: string;
  public_url: string;
  storage_path: string;
  style: string;
  is_published: boolean;
  published_at: string | null;
  duration_sec: number | null;
  created_at: string;
};

function toLocalInput(iso: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function AdminVideosPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [latest, setLatest] = useState<Record<string, VideoRow | undefined>>({});
  const [busyStyle, setBusyStyle] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [publishAt, setPublishAt] = useState<Record<string, string>>({});
  const [historyKey, setHistoryKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.title = "Gestion des vidéos — Admin";
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  const loadBrief = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_video_briefs")
      .select("*")
      .eq("brief_date", today)
      .maybeSingle();
    const raw = (data as any)?.deals;
    const ok =
      Array.isArray(raw) && raw.length > 0 && raw.every((s: any) => s?.type === "selection");
    setBrief(ok ? ((data as unknown) as Brief) : null);
  };

  const loadLatest = async () => {
    const { data } = await supabase
      .from("generated_videos" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = ((data as any[]) || []) as VideoRow[];
    const map: Record<string, VideoRow | undefined> = {};
    for (const s of STYLES) map[s.id] = rows.find((r) => r.style === s.id);
    setLatest(map);
    setPublishAt((prev) => {
      const next = { ...prev };
      for (const s of STYLES) next[s.id] ??= toLocalInput(map[s.id]?.published_at ?? null);
      return next;
    });
  };

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadBrief(), loadLatest()]);
      setLoading(false);
    })();
  }, [isAdmin]);

  const refreshDeals = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("prepare-daily-video-brief", {
      body: { shuffle: true },
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Offres du jour rafraîchies" });
    await loadBrief();
    setLoading(false);
  };

  /**
   * Lance le rendu officiel : même script Remotion et mêmes paramètres que
   * la génération automatique quotidienne (aucun rendu navigateur).
   */
  const generate = async (style: BgPreset) => {
    setBusyStyle(style);
    setProgress(0);
    setStatus("Lancement du rendu Remotion…");
    const before = latest[style]?.id ?? null;
    try {
      const { data, error } = await supabase.functions.invoke("trigger-remotion-render", {
        body: { style },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);

      toast({
        title: `Rendu ${style} lancé`,
        description: "La vidéo apparaîtra ici automatiquement à la fin du rendu (~5–15 min).",
      });

      // Attente passive : on interroge la base jusqu'à l'apparition d'une
      // nouvelle vidéo pour ce style (max 25 min).
      setStatus("Rendu en cours sur le serveur…");
      const deadline = Date.now() + 25 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 20_000));
        const { data: rows } = await supabase
          .from("generated_videos" as any)
          .select("id")
          .eq("style", style)
          .order("created_at", { ascending: false })
          .limit(1);
        const newest = (rows as any[])?.[0]?.id ?? null;
        if (newest && newest !== before) {
          toast({ title: `Vidéo ${style} disponible ✓` });
          break;
        }
        setProgress((p) => Math.min(95, p + 4));
      }
      await loadLatest();
      setHistoryKey((k) => k + 1);
    } catch (e: any) {
      toast({
        title: "Échec du lancement",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setBusyStyle(null);
      setStatus("");
      setProgress(0);
    }
  };


  const publish = async (row: VideoRow, styleId: string) => {
    const local = publishAt[styleId];
    const iso = local ? new Date(local).toISOString() : new Date().toISOString();
    const { error } = await supabase
      .from("generated_videos" as any)
      .update({ is_published: true, published_at: iso })
      .eq("id", row.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vidéo publiée sur le site" });
      await loadLatest();
      setHistoryKey((k) => k + 1);
    }
  };

  const unpublish = async (row: VideoRow) => {
    const { error } = await supabase
      .from("generated_videos" as any)
      .update({ is_published: false })
      .eq("id", row.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vidéo retirée du site" });
      await loadLatest();
      setHistoryKey((k) => k + 1);
    }
  };

  const remove = async (row: VideoRow) => {
    if (!confirm(`Supprimer la vidéo ${row.label} ?`)) return;
    await supabase.storage.from("tiktok-videos").remove([row.storage_path]);
    const { error } = await supabase.from("generated_videos" as any).delete().eq("id", row.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vidéo supprimée" });
      await loadLatest();
      setHistoryKey((k) => k + 1);
    }
  };

  if (isAdmin === null) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Admin
        </Link>
        <Button variant="outline" size="sm" onClick={refreshDeals} disabled={loading || busyStyle !== null}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Rafraîchir les offres du jour
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Clapperboard className="h-7 w-7" /> Gestion des vidéos
      </h1>
      <p className="text-muted-foreground mb-6">
        Une vidéo par direction artistique, générée en direct avec les offres du jour, puis publiée sur le site.
      </p>

      {brief && brief.deals.length > 0 && (
        <div className="border rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-sm">Sélection utilisée</h2>
            <p className="text-xs text-muted-foreground">
              Les produits du jour repris dans les trois vidéos.
            </p>
          </div>
          <Select
            value={String(categoryIdx)}
            onValueChange={(v) => setCategoryIdx(Number(v))}
            disabled={busyStyle !== null}
          >
            <SelectTrigger className="w-full sm:w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {brief.deals.map((s, i) => (
                <SelectItem key={s.category} value={String(i)}>
                  {s.label} · {s.deals.length} produits
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!loading && (!brief || brief.deals.length === 0) && (
        <div className="border rounded-lg p-6 text-center mb-6">
          <p className="mb-4">Aucune sélection du jour. Rafraîchis les offres pour en créer une.</p>
          <Button onClick={refreshDeals}>Rafraîchir les offres</Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid gap-4 md:grid-cols-3 mb-10">
        {STYLES.map((s) => {
          const row = latest[s.id];
          const busy = busyStyle === s.id;
          return (
            <div key={s.id} className="border rounded-lg p-4 flex flex-col">
              <div className="mb-3">
                <h3 className="font-semibold">{s.label}</h3>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>

              {row ? (
                <video
                  src={row.public_url}
                  controls
                  preload="metadata"
                  className="w-full rounded mb-2 bg-black aspect-[9/16] object-contain"
                />
              ) : (
                <div className="w-full rounded mb-2 bg-muted aspect-[9/16] flex items-center justify-center text-xs text-muted-foreground">
                  Aucune vidéo
                </div>
              )}

              {row && (
                <p className="text-xs text-muted-foreground mb-2">
                  {row.label} · {row.brief_date}
                  {" · "}
                  {row.is_published && row.published_at
                    ? `publiée le ${new Date(row.published_at).toLocaleString("fr-FR")}`
                    : "brouillon"}
                </p>
              )}

              {busy && (
                <div className="mb-2">
                  <div className="h-1.5 w-full bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{status} {progress}%</p>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => generate(s.id)}
                  disabled={busyStyle !== null || !brief}
                >
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {row ? "Régénérer" : "Générer"}
                </Button>

                {row && (
                  <>
                    <Input
                      type="datetime-local"
                      value={publishAt[s.id] ?? toLocalInput(null)}
                      onChange={(e) => setPublishAt((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="h-9"
                      aria-label="Date de publication"
                    />
                    <div className="flex gap-2">
                      {row.is_published ? (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => unpublish(row)}>
                          <EyeOff className="h-4 w-4 mr-1" /> Dépublier
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => publish(row, s.id)}>
                          <Eye className="h-4 w-4 mr-1" /> Publier
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(row)} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold mb-4">Historique</h2>
      <VideoHistory key={historyKey} />
    </main>
  );
}
