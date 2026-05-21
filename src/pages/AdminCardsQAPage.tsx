// QA visuelle mobile-first des cartes deals.
// Affiche la vraie <DealCard /> dans 3 viewports mobiles côte à côte
// (360, 375, 414 CSS px), sélectionne des deals "edge cases" (titre très
// long, beaucoup de badges, super deal, promo code, sans prix barré) et
// détecte automatiquement les chevauchements / overflows.
// Route : /admin/cards-qa
import { useEffect, useMemo, useRef, useState } from "react";
import DealCard from "@/components/DealCard";
import type { Deal } from "@/lib/data";

type AnyDeal = Record<string, any>;

const VIEWPORTS = [
  { w: 360, label: "Android (360)" },
  { w: 375, label: "iPhone SE (375)" },
  { w: 414, label: "iPhone Plus (414)" },
];

function pickEdgeCases(all: AnyDeal[]): Deal[] {
  const valid = all.filter((d) => d.image_url && d.brand && d.sale_price != null);
  const byTitleLen = [...valid].sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0));
  const longTitles = byTitleLen.slice(0, 3);
  const superDeals = valid.filter((d) => d.is_super_deal).slice(0, 2);
  const promoMerchants = ["Snipes", "Nike", "Kappa", "JD Sports"];
  const withPromo = valid.filter((d) => promoMerchants.some((m) => (d.merchant || "").includes(m))).slice(0, 3);
  const noStrike = valid.filter((d) => !d.original_price || d.original_price <= d.sale_price).slice(0, 2);
  const bigDiscount = [...valid].sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0)).slice(0, 2);
  // Concatène + dédup par id
  const seen = new Set<string>();
  const out: Deal[] = [];
  for (const d of [...longTitles, ...superDeals, ...withPromo, ...noStrike, ...bigDiscount]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    out.push(d as Deal);
    if (out.length >= 10) break;
  }
  return out;
}

type OverflowReport = { count: number; samples: string[] };

function inspectOverflows(root: HTMLElement): OverflowReport {
  const issues: string[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const className = typeof el.className === "string" ? el.className : "";
    // 1) overflow horizontal réel (le contenu déborde de l'élément lui-même)
    if (el.scrollWidth - el.clientWidth > 2) {
      const tag = `${el.tagName.toLowerCase()}.${className.split(" ")[0] || "?"}`;
      issues.push(`overflow-x ${tag} (+${el.scrollWidth - el.clientWidth}px)`);
      el.style.outline = "1px dashed hsl(0 80% 55%)";
    }
    // 2) texte tronqué silencieusement (nowrap sans ellipsis)
    const cs = getComputedStyle(el);
    if (
      el.children.length === 0 &&
      cs.whiteSpace === "nowrap" &&
      el.scrollWidth > el.clientWidth + 1 &&
      cs.textOverflow !== "ellipsis"
    ) {
      issues.push(`text-clip ${el.tagName.toLowerCase()} "${el.textContent?.slice(0, 24)}…"`);
      el.style.outline = "1px dashed hsl(45 90% 55%)";
    }
  });
  return { count: issues.length, samples: issues.slice(0, 8) };
}


export default function AdminCardsQAPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState("Chargement…");
  const [debug, setDebug] = useState(true);
  const [reports, setReports] = useState<Record<string, OverflowReport>>({});
  const framesRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    document.title = "QA Cartes — Mobile-first";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/deals.json", { cache: "no-store" });
        const all: AnyDeal[] = await res.json();
        const chosen = pickEdgeCases(all);
        setDeals(chosen);
        setStatus(`${chosen.length} deals · edge cases (titres longs, super-deals, promo codes, sans prix barré, gros discount)`);
      } catch (e: any) {
        setStatus("Erreur : " + e?.message);
      }
    })();
  }, []);

  // Détection des overflows après rendu
  useEffect(() => {
    if (deals.length === 0) return;
    const id = setTimeout(() => {
      const out: Record<string, OverflowReport> = {};
      for (const key of Object.keys(framesRef.current)) {
        const el = framesRef.current[key];
        if (el) out[key] = inspectOverflows(el);
      }
      setReports(out);
    }, 800);
    return () => clearTimeout(id);
  }, [deals]);

  const totalIssues = useMemo(
    () => Object.values(reports).reduce((s, r) => s + r.count, 0),
    [reports],
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="sticky top-0 z-50 bg-neutral-900/95 border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-light tracking-wide">QA Cartes Deals — Mobile-first</h1>
            <p className="text-xs text-neutral-400 mt-0.5">{status}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
                className="accent-amber-400"
              />
              Grille baseline 8 px + outline overflows
            </label>
            <span
              className={
                "px-2 py-1 rounded font-mono " +
                (totalIssues === 0
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-red-500/20 text-red-300")
              }
            >
              {totalIssues === 0 ? "✓ aucun overflow" : `${totalIssues} issues détectées`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {VIEWPORTS.map((vp) => {
            const r = reports[vp.label];
            return (
              <div key={vp.w} className="flex-shrink-0">
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <div className="text-sm font-medium">{vp.label}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    {r ? (r.count === 0 ? "ok" : `${r.count} issues`) : "…"}
                  </div>
                </div>
                <div
                  ref={(el) => (framesRef.current[vp.label] = el)}
                  className="bg-white text-black rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 overflow-hidden relative"
                  style={{
                    width: vp.w,
                    backgroundImage: debug
                      ? "repeating-linear-gradient(to bottom, transparent 0 7px, hsl(0 80% 55% / 0.06) 7px 8px)"
                      : undefined,
                  }}
                >
                  {/* Grille 2 colonnes comme sur la home mobile */}
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {deals.map((d) => (
                      <DealCard key={d.id} deal={d} />
                    ))}
                  </div>
                </div>
                {r && r.samples.length > 0 && (
                  <ul className="mt-2 text-[10px] text-amber-300 font-mono space-y-0.5 max-w-[420px]">
                    {r.samples.map((s, i) => (
                      <li key={i}>· {s}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
