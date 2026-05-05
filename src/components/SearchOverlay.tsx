import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, ArrowRight, CornerDownLeft, ShieldCheck, Flame } from "lucide-react";
import { useGender } from "@/lib/gender-context";
import { useI18n } from "@/lib/i18n";
import type { Deal } from "@/lib/data";
import { sortBrandsByPopularity } from "@/lib/brand-popularity";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const RECENT_KEY = "goldeals.recent-searches";
const MAX_RECENT = 6;
const MAX_RESULTS = 8;
const MAX_BRANDS = 6;

// Marchands "fiables" : partenaires Awin officiels avec suivi conversion
const TRUSTED_MERCHANTS = new Set(
  ["snipes", "sneakin", "sport outlet", "sport is good", "kappa", "training fit", "jd sports", "nike"]
);
const isTrusted = (m: string) =>
  TRUSTED_MERCHANTS.has((m || "").toLowerCase().replace(/\s*(fr|eu|uk|de)\s*$/i, "").trim());

type CategoryFilter = "all" | "sneakers" | "vestes" | "hoodies" | "t-shirts" | "pantalons" | "accessoires";
type DiscountFilter = "all" | "30" | "50" | "70";

interface QuickFilters {
  category: CategoryFilter;
  trustedOnly: boolean;
  minDiscount: DiscountFilter;
}

const DEFAULT_FILTERS: QuickFilters = {
  category: "all",
  trustedOnly: false,
  minDiscount: "all",
};

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "sneakers", label: "Sneakers" },
  { key: "vestes", label: "Vestes" },
  { key: "hoodies", label: "Hoodies" },
  { key: "t-shirts", label: "T-shirts" },
  { key: "pantalons", label: "Pantalons" },
  { key: "accessoires", label: "Accessoires" },
];

const DISCOUNT_OPTIONS: { key: DiscountFilter; label: string }[] = [
  { key: "all", label: "Toutes remises" },
  { key: "30", label: "-30 % et +" },
  { key: "50", label: "-50 % et +" },
  { key: "70", label: "-70 % et +" },
];

// ── Utilities ────────────────────────────────────────────────────────────
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Lightweight fuzzy: subsequence match returning position score. */
function fuzzyScore(needle: string, hay: string): number {
  if (!needle) return 0;
  if (!hay) return -1;
  const n = norm(needle);
  const h = norm(hay);
  if (!n) return 0;
  // Exact substring → strong boost weighted by earliness
  const idx = h.indexOf(n);
  if (idx !== -1) return 1000 - idx * 2;
  // Token-prefix match (each needle word is a prefix of some hay word)
  const tokens = n.split(/\s+/).filter(Boolean);
  const hayTokens = h.split(/\s+/);
  let allTokenMatch = true;
  let tokenScore = 0;
  for (const t of tokens) {
    const hit = hayTokens.find((ht) => ht.startsWith(t));
    if (!hit) { allTokenMatch = false; break; }
    tokenScore += 200 - (hit.length - t.length);
  }
  if (allTokenMatch) return 500 + tokenScore;
  // Fallback: subsequence (typo tolerance)
  let i = 0;
  let lastIdx = -1;
  let gaps = 0;
  for (let k = 0; k < h.length && i < n.length; k++) {
    if (h[k] === n[i]) {
      if (lastIdx !== -1) gaps += k - lastIdx - 1;
      lastIdx = k;
      i++;
    }
  }
  if (i === n.length) return Math.max(50, 300 - gaps * 4 - h.length);
  return -1;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const n = norm(query);
  const h = norm(text);
  const idx = h.indexOf(n);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-foreground/15 text-foreground rounded-sm">
        {text.slice(idx, idx + n.length)}
      </mark>
      {text.slice(idx + n.length)}
    </>
  );
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch { return []; }
}
function pushRecent(q: string) {
  if (!q || q.trim().length < 2) return;
  try {
    const cur = loadRecent().filter((x) => norm(x) !== norm(q));
    const next = [q.trim(), ...cur].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

const SearchOverlay = ({ open, onClose }: SearchOverlayProps) => {
  const { t } = useI18n();
  const { filteredDeals } = useGender();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [filters, setFilters] = useState<QuickFilters>(DEFAULT_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setFilters(DEFAULT_FILTERS);
      setRecent(loadRecent());
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Apply quick filters BEFORE search scoring
  const scopedDeals = useMemo(() => {
    const minD = filters.minDiscount === "all" ? 0 : Number(filters.minDiscount);
    return filteredDeals.filter((d) => {
      if (filters.category !== "all" && d.category !== filters.category) return false;
      if (filters.trustedOnly && !isTrusted(d.merchant)) return false;
      if (minD > 0 && (d.discount_percent || 0) < minD) return false;
      return true;
    });
  }, [filteredDeals, filters]);

  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.trustedOnly ? 1 : 0) +
    (filters.minDiscount !== "all" ? 1 : 0);

  // Trending brands = top brands in current scope, ranked by hype score
  const trendingBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of scopedDeals) counts[d.brand] = (counts[d.brand] || 0) + 1;
    return sortBrandsByPopularity(Object.keys(counts), counts).slice(0, 8);
  }, [scopedDeals]);

  // Brand suggestions matching query
  const brandMatches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const seen = new Set<string>();
    const scored: { brand: string; count: number; score: number }[] = [];
    const counts: Record<string, number> = {};
    for (const d of scopedDeals) counts[d.brand] = (counts[d.brand] || 0) + 1;
    for (const brand of Object.keys(counts)) {
      const s = fuzzyScore(query, brand);
      if (s > 0 && !seen.has(brand)) {
        seen.add(brand);
        scored.push({ brand, count: counts[brand], score: s });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, MAX_BRANDS);
  }, [query, scopedDeals]);

  // Deal results with weighted scoring
  const dealResults = useMemo<Deal[]>(() => {
    if (query.trim().length < 2) return [];
    const scored: { deal: Deal; score: number }[] = [];
    for (const d of scopedDeals) {
      const titleScore = fuzzyScore(query, d.title) * 1.0;
      const brandScore = fuzzyScore(query, d.brand) * 0.8;
      const merchantScore = fuzzyScore(query, d.merchant) * 0.4;
      const best = Math.max(titleScore, brandScore, merchantScore);
      if (best > 0) {
        // Boost by discount (popular deals first when ties)
        const boost = (d.discount_percent || 0) * 0.3;
        scored.push({ deal: d, score: best + boost });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((x) => x.deal);
  }, [query, scopedDeals]);

  const totalMatches = useMemo(() => {
    if (query.trim().length < 2) return 0;
    let n = 0;
    for (const d of scopedDeals) {
      if (
        fuzzyScore(query, d.title) > 0 ||
        fuzzyScore(query, d.brand) > 0 ||
        fuzzyScore(query, d.merchant) > 0
      ) n++;
    }
    return n;
  }, [query, scopedDeals]);

  // Flat keyboard-navigable list: brands then deals
  const flatItems = useMemo(() => {
    const items: { kind: "brand" | "deal"; value: string; deal?: Deal }[] = [];
    for (const b of brandMatches) items.push({ kind: "brand", value: b.brand });
    for (const d of dealResults) items.push({ kind: "deal", value: d.id, deal: d });
    return items;
  }, [brandMatches, dealResults]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const submitQuery = useCallback((q: string) => {
    if (!q || q.trim().length < 2) return;
    pushRecent(q);
    onClose();
    navigate(`/?q=${encodeURIComponent(q.trim())}`);
  }, [navigate, onClose]);

  const activate = useCallback((idx: number) => {
    const item = flatItems[idx];
    if (!item) {
      submitQuery(query);
      return;
    }
    pushRecent(query);
    onClose();
    if (item.kind === "brand") {
      navigate(`/brand/${encodeURIComponent(item.value.toLowerCase().replace(/\s+/g, "-"))}`);
    } else if (item.deal) {
      navigate(`/deal/${item.deal.id}`);
    }
  }, [flatItems, query, navigate, onClose, submitQuery]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        activate(activeIdx);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatItems.length, activeIdx, activate, onClose]);

  // Scroll active row into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  const showInitial = query.trim().length < 2;
  const noResults = !showInitial && flatItems.length === 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background animate-fade-in overflow-y-auto"
      role="dialog"
      aria-label={t.search}
    >
      <div className="container mx-auto px-4 pt-6 pb-12 max-w-3xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-foreground/15 pb-3">
          <Search className="w-5 h-5 text-foreground/40 flex-shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="flex-1 bg-transparent text-lg font-body placeholder:text-foreground/30 focus:outline-none min-w-0"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-body uppercase tracking-wider text-foreground/40 border border-foreground/15 px-2 py-1">
            ESC
          </kbd>
          <button onClick={onClose} className="p-2 hover:bg-accent/50 transition-colors" aria-label="Fermer">
            <X className="w-5 h-5 text-foreground/50" strokeWidth={1.5} />
          </button>
        </div>

        {/* Quick filters bar */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 brand-scroll">
          {/* Category select-style chips (horizontal scroll) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilters((f) => ({ ...f, category: opt.key }))}
                className={`text-[10px] font-display uppercase tracking-wider px-2.5 py-1 border whitespace-nowrap transition-colors ${
                  filters.category === opt.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="h-4 w-px bg-foreground/15 flex-shrink-0 mx-1" aria-hidden />

          <button
            onClick={() => setFilters((f) => ({ ...f, trustedOnly: !f.trustedOnly }))}
            className={`flex items-center gap-1 text-[10px] font-display uppercase tracking-wider px-2.5 py-1 border whitespace-nowrap transition-colors flex-shrink-0 ${
              filters.trustedOnly
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/15 hover:border-foreground/40"
            }`}
            title="Marchands partenaires officiels avec suivi de commande"
          >
            <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
            Vendeurs fiables
          </button>

          <span className="h-4 w-px bg-foreground/15 flex-shrink-0 mx-1" aria-hidden />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {DISCOUNT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilters((f) => ({ ...f, minDiscount: opt.key }))}
                className={`flex items-center gap-1 text-[10px] font-display uppercase tracking-wider px-2.5 py-1 border whitespace-nowrap transition-colors ${
                  filters.minDiscount === opt.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                {opt.key !== "all" && <Flame className="w-3 h-3" strokeWidth={1.5} />}
                {opt.label}
              </button>
            ))}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="ml-auto text-[10px] font-body uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
            >
              Réinitialiser ({activeFilterCount})
            </button>
          )}
        </div>

        {showInitial && (
          <div className="mt-8 space-y-8">
            {recent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                    <Clock className="w-3 h-3" strokeWidth={1.5} /> Recherches récentes
                  </p>
                  <button
                    onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                    className="text-[10px] font-body uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors"
                  >
                    Effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="text-xs font-body px-3 py-1.5 border border-foreground/15 hover:border-foreground/40 hover:bg-accent/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trendingBrands.length > 0 && (
              <div>
                <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" strokeWidth={1.5} /> Marques populaires
                </p>
                <div className="flex flex-wrap gap-2">
                  {trendingBrands.map((b) => (
                    <button
                      key={b}
                      onClick={() => setQuery(b)}
                      className="text-xs font-display uppercase tracking-wider px-3 py-1.5 border border-foreground/15 hover:border-foreground/40 hover:bg-accent/30 transition-colors"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-body text-foreground/30 text-center pt-4">
              Astuce : <kbd className="border border-foreground/15 px-1.5 py-0.5 text-[10px]">⌘</kbd>{" "}
              <kbd className="border border-foreground/15 px-1.5 py-0.5 text-[10px]">K</kbd> pour ouvrir la recherche partout.
            </p>
          </div>
        )}

        {/* No results */}
        {noResults && (
          <div className="mt-12 text-center">
            <p className="text-sm font-body text-foreground/60">
              Aucun résultat pour <span className="font-display">"{query}"</span>
            </p>
            <p className="text-xs font-body text-foreground/40 mt-2">
              Essayez avec un autre mot-clé ou explorez nos marques populaires.
            </p>
          </div>
        )}

        {/* Results */}
        {!showInitial && flatItems.length > 0 && (
          <div ref={listRef} className="mt-6 space-y-6">
            {brandMatches.length > 0 && (
              <div>
                <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-2">
                  Marques
                </p>
                <div className="flex flex-col">
                  {brandMatches.map((b, i) => (
                    <button
                      key={b.brand}
                      data-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => activate(i)}
                      className={`flex items-center justify-between text-left px-3 py-2.5 transition-colors ${
                        activeIdx === i ? "bg-accent/40" : "hover:bg-accent/20"
                      }`}
                    >
                      <span className="font-display text-sm tracking-wide">
                        {highlight(b.brand, query)}
                      </span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-foreground/40">
                        {b.count} deals
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dealResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40">
                    Produits
                  </p>
                  {totalMatches > MAX_RESULTS && (
                    <button
                      onClick={() => submitQuery(query)}
                      className="text-[10px] font-body uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      Voir les {totalMatches} résultats <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col">
                  {dealResults.map((deal, j) => {
                    const idx = brandMatches.length + j;
                    return (
                      <Link
                        key={deal.id}
                        to={`/deal/${deal.id}`}
                        data-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => { pushRecent(query); onClose(); }}
                        className={`flex items-center gap-4 p-3 transition-colors ${
                          activeIdx === idx ? "bg-accent/40" : "hover:bg-accent/20"
                        }`}
                      >
                        <img
                          src={deal.image_url}
                          alt={deal.title}
                          loading="lazy"
                          className="w-14 h-14 object-cover flex-shrink-0 bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-body text-foreground/40 uppercase tracking-wider">
                            {deal.brand} · {deal.merchant}
                          </p>
                          <p className="font-display text-sm tracking-wide truncate">
                            {highlight(deal.title, query)}
                          </p>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            {deal.sale_price != null && (
                              <span className="font-display text-sm">{deal.sale_price.toFixed(2)}€</span>
                            )}
                            {deal.original_price != null && (
                              <span className="font-body text-xs text-foreground/40 line-through">
                                {deal.original_price.toFixed(2)}€
                              </span>
                            )}
                            {deal.discount_percent != null && deal.discount_percent > 0 && (
                              <span className="text-[10px] font-body text-foreground/50">
                                -{deal.discount_percent}%
                              </span>
                            )}
                          </div>
                        </div>
                        {activeIdx === idx && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-foreground/40 flex-shrink-0" strokeWidth={1.5} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        {!showInitial && flatItems.length > 0 && (
          <div className="mt-8 pt-4 border-t border-foreground/10 flex items-center justify-center gap-4 text-[10px] font-body uppercase tracking-wider text-foreground/40">
            <span className="flex items-center gap-1">
              <kbd className="border border-foreground/15 px-1.5 py-0.5">↑</kbd>
              <kbd className="border border-foreground/15 px-1.5 py-0.5">↓</kbd> Naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-foreground/15 px-1.5 py-0.5">↵</kbd> Ouvrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-foreground/15 px-1.5 py-0.5">ESC</kbd> Fermer
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
