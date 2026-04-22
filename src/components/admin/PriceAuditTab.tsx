import { useEffect, useMemo, useState } from "react";
import { Deal, loadDeals } from "@/lib/data";
import { AlertTriangle, CheckCircle2, Loader2, TrendingDown, ExternalLink } from "lucide-react";

interface MerchantStat {
  merchant: string;
  total: number;
  missing: number;
  equal: number;
  invalid: number; // original < sale
  valid: number;
  coverage: number; // % with valid original_price
  avgDiscount: number;
}

const PriceAuditTab = () => {
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals().then((d) => {
      setAllDeals(d);
      setLoading(false);
    });
  }, []);

  const { merchantStats, globalStats, samplesMissing, samplesEqual } = useMemo(() => {
    const byMerchant: Record<string, {
      total: number; missing: number; equal: number; invalid: number; valid: number; discountSum: number; discountCount: number;
    }> = {};

    const samplesMissing: any[] = [];
    const samplesEqual: any[] = [];

    for (const d of allDeals) {
      const m = d.merchant || "Inconnu";
      if (!byMerchant[m]) {
        byMerchant[m] = { total: 0, missing: 0, equal: 0, invalid: 0, valid: 0, discountSum: 0, discountCount: 0 };
      }
      const s = byMerchant[m];
      s.total++;

      const sale = Number(d.sale_price ?? 0);
      const orig = d.original_price == null ? null : Number(d.original_price);

      if (orig == null || orig === 0) {
        s.missing++;
        if (samplesMissing.length < 50) samplesMissing.push(d);
      } else if (sale > 0 && Math.abs(orig - sale) < 0.01) {
        s.equal++;
        if (samplesEqual.length < 50) samplesEqual.push(d);
      } else if (sale > 0 && orig < sale) {
        s.invalid++;
      } else {
        s.valid++;
        if (d.discount_percent) {
          s.discountSum += Number(d.discount_percent);
          s.discountCount++;
        }
      }
    }

    const merchantStats: MerchantStat[] = Object.entries(byMerchant)
      .map(([merchant, s]) => ({
        merchant,
        total: s.total,
        missing: s.missing,
        equal: s.equal,
        invalid: s.invalid,
        valid: s.valid,
        coverage: s.total > 0 ? (s.valid / s.total) * 100 : 0,
        avgDiscount: s.discountCount > 0 ? s.discountSum / s.discountCount : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const totals = merchantStats.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        missing: acc.missing + s.missing,
        equal: acc.equal + s.equal,
        invalid: acc.invalid + s.invalid,
        valid: acc.valid + s.valid,
      }),
      { total: 0, missing: 0, equal: 0, invalid: 0, valid: 0 },
    );

    return {
      merchantStats,
      globalStats: {
        ...totals,
        coverage: totals.total > 0 ? (totals.valid / totals.total) * 100 : 0,
      },
      samplesMissing,
      samplesEqual,
    };
  }, [allDeals]);

  const exportCsv = (rows: any[], name: string) => {
    const headers = ["id", "merchant", "brand", "title", "sale_price", "original_price", "discount_percent", "product_url"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h] ?? "";
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-prix-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Description */}
      <div className="border border-foreground/10 p-4 sm:p-6">
        <h2 className="font-display text-sm sm:text-base uppercase tracking-widest mb-2">Audit prix Awin</h2>
        <p className="font-body text-xs sm:text-sm text-foreground/60">
          Vérifie la cohérence des prix barrés (<code className="text-foreground/80">original_price</code>) issus des flux Awin.
          Détecte les deals sans prix original, les prix égaux au prix de vente (réduction = 0%) et les anomalies (original &lt; sale).
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
        <AuditKpi label="Total deals" value={globalStats.total} />
        <AuditKpi label="Prix valides" value={globalStats.valid} accent="green" icon={<CheckCircle2 className="w-4 h-4" />} />
        <AuditKpi label="Prix manquants" value={globalStats.missing} accent="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <AuditKpi label="Prix égaux (0%)" value={globalStats.equal} accent="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <AuditKpi label="Couverture" value={`${globalStats.coverage.toFixed(1)}%`} accent="green" icon={<TrendingDown className="w-4 h-4" />} />
      </div>

      {/* Merchant breakdown */}
      <div className="border border-foreground/10">
        <div className="px-4 py-3 border-b border-foreground/8 flex items-center justify-between">
          <h3 className="font-display text-xs uppercase tracking-widest">Cohérence par marchand</h3>
          <span className="font-body text-[10px] text-foreground/50">{merchantStats.length} marchands</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-foreground/5">
              <tr className="text-left">
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px]">Marchand</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Total</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Valides</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Manquants</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Égaux</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Anomalies</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Couverture</th>
                <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Réduc. moy.</th>
              </tr>
            </thead>
            <tbody>
              {merchantStats.map((s) => {
                const status = s.coverage >= 90 ? "green" : s.coverage >= 50 ? "amber" : "red";
                return (
                  <tr key={s.merchant} className="border-t border-foreground/5">
                    <td className="px-3 py-2 font-body">{s.merchant}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums">{s.total.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums text-green-700 dark:text-green-400">{s.valid.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums text-red-700 dark:text-red-400">{s.missing.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums text-orange-700 dark:text-orange-400">{s.equal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums">{s.invalid.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-body tabular-nums">
                      <span
                        className={
                          status === "green"
                            ? "text-green-700 dark:text-green-400"
                            : status === "amber"
                              ? "text-orange-700 dark:text-orange-400"
                              : "text-red-700 dark:text-red-400"
                        }
                      >
                        {s.coverage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-body tabular-nums">{s.avgDiscount > 0 ? `${s.avgDiscount.toFixed(0)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SampleTable
          title="Échantillons — prix manquants"
          description="Deals sans original_price (NULL ou 0)"
          rows={samplesMissing}
          onExport={() => exportCsv(samplesMissing, "manquants")}
          emptyMessage="Aucun deal sans prix original 🎉"
        />
        <SampleTable
          title="Échantillons — prix égaux"
          description="Deals où original_price = sale_price (faux deals 0%)"
          rows={samplesEqual}
          onExport={() => exportCsv(samplesEqual, "egaux")}
          emptyMessage="Aucun faux deal détecté 🎉"
        />
      </div>
    </div>
  );
};

const AuditKpi = ({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent?: "green" | "red";
  icon?: React.ReactNode;
}) => (
  <div className="border border-foreground/10 p-3 sm:p-4">
    <div className="flex items-center gap-1.5 text-foreground/40 mb-1">
      {icon}
      <span className="font-display text-[9px] sm:text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <div
      className={`font-display text-lg sm:text-2xl tabular-nums ${
        accent === "green" ? "text-green-700 dark:text-green-400" : accent === "red" ? "text-red-700 dark:text-red-400" : ""
      }`}
    >
      {typeof value === "number" ? value.toLocaleString() : value}
    </div>
  </div>
);

const SampleTable = ({
  title,
  description,
  rows,
  onExport,
  emptyMessage,
}: {
  title: string;
  description: string;
  rows: any[];
  onExport: () => void;
  emptyMessage: string;
}) => (
  <div className="border border-foreground/10">
    <div className="px-4 py-3 border-b border-foreground/8 flex items-center justify-between gap-2">
      <div>
        <h3 className="font-display text-xs uppercase tracking-widest">{title}</h3>
        <p className="font-body text-[10px] text-foreground/50 mt-0.5">{description}</p>
      </div>
      {rows.length > 0 && (
        <button
          onClick={onExport}
          className="px-3 py-1.5 border border-foreground/10 text-[10px] font-display uppercase tracking-widest text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          CSV
        </button>
      )}
    </div>
    {rows.length === 0 ? (
      <div className="p-6 text-center font-body text-xs text-foreground/50">{emptyMessage}</div>
    ) : (
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-foreground/5 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px]">Marchand</th>
              <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px]">Produit</th>
              <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Sale</th>
              <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px] text-right">Orig.</th>
              <th className="px-3 py-2 font-display uppercase tracking-wider text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((d) => (
              <tr key={d.id} className="border-t border-foreground/5">
                <td className="px-3 py-2 font-body text-foreground/70 whitespace-nowrap">{d.merchant}</td>
                <td className="px-3 py-2 font-body truncate max-w-[200px]" title={d.title}>
                  <span className="text-foreground/50">{d.brand}</span> · {d.title}
                </td>
                <td className="px-3 py-2 text-right font-body tabular-nums">{d.sale_price ?? "—"}</td>
                <td className="px-3 py-2 text-right font-body tabular-nums text-foreground/40">
                  {d.original_price == null ? "NULL" : d.original_price}
                </td>
                <td className="px-3 py-2">
                  {d.product_url && (
                    <a
                      href={d.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/40 hover:text-foreground"
                      title="Ouvrir le produit"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default PriceAuditTab;
