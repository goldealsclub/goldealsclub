import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, Download, RefreshCw, Trash2, Search, X } from "lucide-react";

type VideoRow = {
  id: string;
  brief_date: string;
  category: string;
  label: string;
  storage_path: string;
  public_url: string;
  caption: string;
  hashtags: string;
  size_bytes: number | null;
  duration_sec: number | null;
  images_loaded: number | null;
  style: string | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
};

type Props = {
  /** Limit number of rows displayed (e.g. 12 for embed view) */
  limit?: number;
  compact?: boolean;
};

export default function VideoHistory({ limit, compact }: Props) {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [date, setDate] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("generated_videos" as any)
      .select("*")
      .order("brief_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(((data as any[]) || []) as VideoRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (date && r.brief_date !== date) return false;
      if (q && !`${r.label} ${r.category} ${r.caption} ${r.hashtags}`.toLowerCase().includes(q))
        return false;
      return true;
    });
    if (limit) out = out.slice(0, limit);
    return out;
  }, [rows, search, category, date, limit]);

  const handleDelete = async (item: VideoRow) => {
    if (!confirm(`Supprimer "${item.label}" du ${item.brief_date} ?`)) return;
    await supabase.storage.from("tiktok-videos").remove([item.storage_path]);
    const { error } = await supabase.from("generated_videos" as any).delete().eq("id", item.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vidéo supprimée" });
      load();
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setDate("");
  };

  const hasFilters = search || category !== "all" || date;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre, hashtag…)"
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[160px]"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} vidéo{filtered.length > 1 ? "s" : ""}
        {limit && rows.length > limit ? ` (sur ${rows.length})` : ""}
      </p>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucune vidéo ne correspond à ces filtres.
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
          {filtered.map((item) => (
            <div key={item.id} className="border rounded-lg p-3 flex flex-col">
              <video
                src={item.public_url}
                controls
                preload="metadata"
                className="w-full rounded mb-2 bg-black aspect-[9/16] object-contain"
              />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase">{item.category}</span>
                <span className="text-xs text-muted-foreground">{item.brief_date}</span>
              </div>
              {(item.images_loaded ?? 2) < 2 && (
                <span
                  className="inline-flex items-center gap-1 self-start mb-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300"
                  title="Au moins une photo produit n'a pas chargé — placeholder éditorial utilisé"
                >
                  ⚠ {item.images_loaded === 0 ? "Aucune photo" : "1 photo manquante"}
                </span>
              )}
              <p className="text-sm font-medium mb-2 line-clamp-1">{item.label}</p>
              <div className="flex gap-2 mt-auto">
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <a href={item.public_url} download={`battle-${item.category}-${item.brief_date}.webm`}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Télécharger
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(item)} aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
