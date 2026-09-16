import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";

type StyleRow = {
  style_id: string;
  label: string;
  bg_top: string;
  bg_mid: string;
  bg_bot: string;
  ink: string;
  ink_soft: string;
  accent: string;
  taupe: string;
  display_font: string;
  body_font: string;
  title_font_size: number;
  title_uppercase: boolean;
  eyebrow_label: string;
  price_font_size: number;
  price_label: string;
  show_strikethrough: boolean;
  show_discount_chip: boolean;
};

const COLORS: (keyof StyleRow)[] = ["bg_top", "bg_mid", "bg_bot", "ink", "ink_soft", "accent", "taupe"];
const COLOR_LABELS: Record<string, string> = {
  bg_top: "Fond (haut)",
  bg_mid: "Fond (milieu)",
  bg_bot: "Fond (bas)",
  ink: "Texte principal",
  ink_soft: "Texte secondaire",
  accent: "Accent",
  taupe: "Taupe",
};

const AdminStylesPage = () => {
  const { isAdmin, loading } = useAdmin();
  const [rows, setRows] = useState<StyleRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("video_style_settings" as any)
        .select("*")
        .order("style_id");
      setRows(((data as any[]) || []) as StyleRow[]);
    })();
  }, []);

  const patch = (id: string, key: keyof StyleRow, value: any) =>
    setRows((prev) => prev.map((r) => (r.style_id === id ? { ...r, [key]: value } : r)));

  const save = async (row: StyleRow) => {
    setSaving(row.style_id);
    const { style_id, ...rest } = row;
    const { error } = await supabase
      .from("video_style_settings" as any)
      .update(rest as any)
      .eq("style_id", style_id);
    setSaving(null);
    if (error) toast.error("Enregistrement impossible");
    else toast.success(`Style ${style_id} enregistré`);
  };

  if (loading) return null;
  if (!isAdmin) return <div className="p-10 font-body text-sm">Accès réservé.</div>;

  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="font-display text-2xl tracking-wider mb-1">Styles vidéo</h1>
      <p className="font-body text-xs text-foreground/50 mb-8">
        Ajustez couleurs, typographies, titre et prix. Les prochaines vidéos générées en tiennent compte.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {rows.map((r) => (
          <section key={r.style_id} className="border border-foreground/10 p-5 space-y-4">
            <h2 className="font-display text-lg uppercase tracking-widest">{r.label || r.style_id}</h2>

            <div className="grid grid-cols-2 gap-3">
              {COLORS.map((c) => (
                <div key={String(c)} className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider">{COLOR_LABELS[String(c)]}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(String(r[c])) ? String(r[c]) : "#000000"}
                      onChange={(e) => patch(r.style_id, c, e.target.value)}
                      className="h-8 w-10 border border-foreground/15 bg-transparent"
                    />
                    <Input
                      value={String(r[c] ?? "")}
                      onChange={(e) => patch(r.style_id, c, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider">Police titres</Label>
                <Input value={r.display_font} onChange={(e) => patch(r.style_id, "display_font", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider">Police texte</Label>
                <Input value={r.body_font} onChange={(e) => patch(r.style_id, "body_font", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider">Taille titre</Label>
                <Input type="number" value={r.title_font_size} onChange={(e) => patch(r.style_id, "title_font_size", Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider">Taille prix</Label>
                <Input type="number" value={r.price_font_size} onChange={(e) => patch(r.style_id, "price_font_size", Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] uppercase tracking-wider">Surtitre</Label>
                <Input value={r.eyebrow_label} onChange={(e) => patch(r.style_id, "eyebrow_label", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] uppercase tracking-wider">Libellé prix</Label>
                <Input value={r.price_label} onChange={(e) => patch(r.style_id, "price_label", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider">Titre en majuscules</Label>
                <Switch checked={r.title_uppercase} onCheckedChange={(v) => patch(r.style_id, "title_uppercase", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider">Prix barré</Label>
                <Switch checked={r.show_strikethrough} onCheckedChange={(v) => patch(r.style_id, "show_strikethrough", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider">Pastille remise</Label>
                <Switch checked={r.show_discount_chip} onCheckedChange={(v) => patch(r.style_id, "show_discount_chip", v)} />
              </div>
            </div>

            <Button onClick={() => save(r)} disabled={saving === r.style_id} className="w-full">
              {saving === r.style_id ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </section>
        ))}
      </div>
    </main>
  );
};

export default AdminStylesPage;
