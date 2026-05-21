// Page de QA visuelle des frames vidéo — rend 10 deals (mix produits clairs
// et foncés) avec le pipeline réel (cutout, plate sombre, contour fin,
// badge prix noir, ombres). Route : /admin/video-qa
import { useEffect, useRef, useState } from "react";
import {
  W,
  H,
  applyBgPreset,
  loadImage,
  getBrandLogo,
  drawDealFullScreen,
  type Deal,
  type BgPreset,
} from "./AdminVideoPage";

type AnyDeal = Record<string, any>;

function toDeal(d: AnyDeal): Deal {
  return {
    id: String(d.id ?? d._id ?? Math.random()),
    title: String(d.title ?? ""),
    brand: String(d.brand ?? ""),
    merchant: String(d.merchant ?? ""),
    sale_price: d.sale_price ?? null,
    original_price: d.original_price ?? null,
    discount_percent: d.discount_percent ?? null,
    currency: String(d.currency ?? "EUR"),
    image_url: String(d.image_url ?? ""),
    url: String(d.affiliate_url ?? d.product_url ?? d.url ?? ""),
  };
}

const LIGHT_RX = /\b(blanc|white|ivoire|ivory|cream|crème|écru|ecru|beige|sable|sand|nude|off.?white|optic|chalk)\b/i;
const DARK_RX = /\b(noir|black|charbon|charcoal|onyx|anthracite|graphite|dark|navy|marine)\b/i;

export default function AdminVideoQAPage() {
  const [status, setStatus] = useState("Chargement des deals…");
  const [deals, setDeals] = useState<Deal[]>([]);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    document.title = "QA Vidéo — Détourage & Badge";
  }, []);

  // Sélection 10 deals : 5 clairs + 5 foncés
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/deals.json", { cache: "no-store" });
        const all: AnyDeal[] = await res.json();
        const valid = all.filter((d) => d.image_url && d.brand && d.sale_price);
        const lights = valid.filter((d) => LIGHT_RX.test(d.title || ""));
        const darks = valid.filter((d) => DARK_RX.test(d.title || ""));
        const pick = <T,>(arr: T[], n: number) => {
          const out: T[] = [];
          const seen = new Set<number>();
          while (out.length < n && seen.size < arr.length) {
            const i = Math.floor(Math.random() * arr.length);
            if (seen.has(i)) continue;
            seen.add(i);
            out.push(arr[i]);
          }
          return out;
        };
        const chosen = [...pick(lights, 5), ...pick(darks, 5)].map(toDeal);
        setDeals(chosen);
        setStatus(`Rendu de ${chosen.length} frames…`);
      } catch (e: any) {
        setStatus("Erreur de chargement : " + e?.message);
      }
    })();
  }, []);

  // Rendu séquentiel des frames
  useEffect(() => {
    if (deals.length === 0) return;
    let cancelled = false;
    (async () => {
      const preset: BgPreset = "zara";
      applyBgPreset(preset);
      for (let i = 0; i < deals.length; i++) {
        if (cancelled) return;
        const deal = deals[i];
        const canvas = refs.current[i];
        if (!canvas) continue;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        const [img, logo] = await Promise.all([
          loadImage(deal.image_url),
          getBrandLogo(deal.brand),
        ]);
        // Frame en pleine révélation (hold milieu) → ce que verra l'utilisateur
        drawDealFullScreen(ctx, deal, img, 1, 0, i + 1, 0.5, true, logo);
      }
      setStatus("Rendu terminé ✓");
    })();
    return () => {
      cancelled = true;
    };
  }, [deals]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-light tracking-wide mb-1">
          QA Visuelle — Détourage, badge prix, ombres
        </h1>
        <p className="text-sm text-neutral-400 mb-6">
          {status} · 5 produits clairs + 5 produits foncés · preset <code>zara</code>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {deals.map((d, i) => (
            <div key={d.id} className="space-y-2">
              <div className="aspect-[9/16] bg-black rounded-md overflow-hidden ring-1 ring-white/10">
                <canvas
                  ref={(el) => (refs.current[i] = el)}
                  className="w-full h-full block"
                />
              </div>
              <div className="text-[11px] leading-tight text-neutral-300">
                <div className="font-medium truncate">{d.brand}</div>
                <div className="text-neutral-500 truncate">{d.title}</div>
                <div className="text-neutral-400">
                  {LIGHT_RX.test(d.title) ? "☼ clair" : DARK_RX.test(d.title) ? "● foncé" : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
