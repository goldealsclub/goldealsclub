import { useState, useMemo } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Deal, DealLevel, Category, deals as allDealsGlobal } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import FlameIndicator from "./FlameIndicator";

export type SortKey = "relevance" | "discount" | "popularity" | "newest" | "priceAsc" | "priceDesc";

const PAGE_SIZE = 48;

interface Filters {
  dealLevel: DealLevel | "all";
  categories: Category[];
  brands: string[];
  merchants: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minDiscount: number | null;
}

const defaultFilters: Filters = {
  dealLevel: "all",
  categories: [],
  brands: [],
  merchants: [],
  minPrice: null,
  maxPrice: null,
  minDiscount: null,
};

function getUniqueValues(items: Deal[], key: keyof Deal): string[] {
  return [...new Set(items.map((d) => String(d[key])))].sort();
}

interface DealFiltersProps {
  sourceDeals: Deal[];
  children: (filtered: Deal[]) => React.ReactNode;
}

const FilterChip = ({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`ml-1.5 text-[9px] ${active ? "text-primary-foreground/70" : "text-foreground/30"}`}>({count})</span>
    )}
  </button>
);

const FilterSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-foreground/6 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-[10px] font-display uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors"
      >
        {title}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && <div className="pb-3 flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
};

const DealFilters = ({ sourceDeals, children }: DealFiltersProps) => {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Reset page when filters/sort/source change
  const resetPage = () => setPage(1);

  // Use ALL deals for filter options so gender filtering doesn't hide categories
  const allBrands = useMemo(() => getUniqueValues(allDealsGlobal, "brand"), [allDealsGlobal.length]);
  const allMerchants = useMemo(() => getUniqueValues(allDealsGlobal, "merchant"), [allDealsGlobal.length]);
  const allCategories = useMemo(() => getUniqueValues(allDealsGlobal, "category") as Category[], [allDealsGlobal.length]);

  // Counters from sourceDeals (reflects current gender/page filter)
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sourceDeals.forEach(d => { counts[d.brand] = (counts[d.brand] || 0) + 1; });
    return counts;
  }, [sourceDeals]);

  const merchantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sourceDeals.forEach(d => { counts[d.merchant] = (counts[d.merchant] || 0) + 1; });
    return counts;
  }, [sourceDeals]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sourceDeals.forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
    return counts;
  }, [sourceDeals]);

  const categoryLabels: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, "t-shirts": "T-shirts", pants: t.pants,
    pantalons: "Pantalons", accessories: t.accessories, accessoires: t.accessories,
    vestes: t.jackets, autres: "Autres",
  };

  const levelTabs: { key: DealLevel | "all"; label: string; flames: number }[] = [
    { key: "all", label: t.allPromos, flames: 0 },
    { key: "promo-normale", label: t.normalPromos, flames: 1 },
    { key: "bon-deal", label: t.goodDeals, flames: 2 },
    { key: "hot-deal", label: t.hotDeals, flames: 3 },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t.newest },
    { key: "popularity", label: t.popularity },
    { key: "discount", label: t.discount },
    { key: "priceAsc", label: t.priceAsc },
    { key: "priceDesc", label: t.priceDesc },
  ];

  const toggleArray = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const activeCount =
    (filters.dealLevel !== "all" ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    filters.merchants.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.minDiscount !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let result = [...sourceDeals];

    if (filters.dealLevel !== "all") result = result.filter((d) => d.deal_level === filters.dealLevel);
    if (filters.categories.length) result = result.filter((d) => filters.categories.includes(d.category));
    if (filters.brands.length) result = result.filter((d) => filters.brands.includes(d.brand));
    if (filters.merchants.length) result = result.filter((d) => filters.merchants.includes(d.merchant));
    if (filters.minPrice !== null) result = result.filter((d) => (d.sale_price ?? 0) >= filters.minPrice!);
    if (filters.maxPrice !== null) result = result.filter((d) => (d.sale_price ?? 0) <= filters.maxPrice!);
    if (filters.minDiscount !== null) result = result.filter((d) => (d.discount_percent ?? 0) >= filters.minDiscount!);

    // Boost Snipes & Nike to the top
    const isBoost = (d: Deal) => {
      const src = d.source?.toLowerCase() || "";
      const merchant = d.merchant?.toLowerCase() || "";
      const brand = d.brand?.toLowerCase() || "";
      if (src === "snipes" || merchant.includes("snipes")) return 2;
      if (brand === "nike" || src === "nike") return 1;
      return 0;
    };

    result.sort((a, b) => {
      const boostDiff = isBoost(b) - isBoost(a);
      if (boostDiff !== 0) return boostDiff;

      if (sort === "discount") return (b.discount_percent ?? 0) - (a.discount_percent ?? 0);
      if (sort === "popularity") return b.popularity - a.popularity;
      if (sort === "priceAsc") return (a.sale_price ?? 0) - (b.sale_price ?? 0);
      if (sort === "priceDesc") return (b.sale_price ?? 0) - (a.sale_price ?? 0);
      const dateA = new Date(a.promo_start_date || a.detected_at).getTime();
      const dateB = new Date(b.promo_start_date || b.detected_at).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    });

    return result;
  }, [sourceDeals, filters, sort]);

  // Paginated slice
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages || 1);
  const paginatedDeals = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // Level counts for tabs
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceDeals.length };
    sourceDeals.forEach(d => { counts[d.deal_level] = (counts[d.deal_level] || 0) + 1; });
    return counts;
  }, [sourceDeals]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Level tabs with counters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {levelTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilters((f) => ({ ...f, dealLevel: tab.key })); resetPage(); }}
            className={`flex items-center gap-2 text-[10px] font-display uppercase tracking-wider px-4 py-2 border transition-all whitespace-nowrap ${
              filters.dealLevel === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {tab.flames > 0 && <FlameIndicator count={tab.flames} className="scale-90" />}
            {tab.label}
            <span className={`text-[9px] ${filters.dealLevel === tab.key ? "text-primary-foreground/70" : "text-foreground/30"}`}>
              ({levelCounts[tab.key] || 0})
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-foreground/8 pb-4 mb-6">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-[10px] font-display uppercase tracking-widest text-foreground/40 whitespace-nowrap">{t.sortBy}</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setSort(opt.key); resetPage(); }}
              className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 transition-colors whitespace-nowrap ${
                sort === opt.key ? "bg-primary text-primary-foreground" : "text-foreground/40 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-[10px] font-display uppercase tracking-wider px-4 py-2 border border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors ml-4"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
          {t.filters}
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground w-4 h-4 flex items-center justify-center text-[9px]">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="border border-foreground/8 bg-background p-6 mb-8 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-display uppercase tracking-widest text-foreground/50">{t.filters}</span>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button
                  onClick={() => { setFilters(defaultFilters); resetPage(); }}
                  className="text-[10px] font-body text-foreground/40 hover:text-foreground underline transition-colors"
                >
                  {t.clearAll}
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-accent/50 transition-colors">
                <X className="w-3.5 h-3.5 text-foreground/40" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
            <FilterSection title={t.category} defaultOpen>
              {allCategories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={categoryLabels[cat] || cat}
                  count={categoryCounts[cat] || 0}
                  active={filters.categories.includes(cat)}
                  onClick={() => { setFilters((f) => ({ ...f, categories: toggleArray(f.categories, cat) })); resetPage(); }}
                />
              ))}
            </FilterSection>

            <FilterSection title={t.brand} defaultOpen>
              {allBrands.map((b) => (
                <FilterChip
                  key={b}
                  label={b}
                  count={brandCounts[b] || 0}
                  active={filters.brands.includes(b)}
                  onClick={() => { setFilters((f) => ({ ...f, brands: toggleArray(f.brands, b) })); resetPage(); }}
                />
              ))}
            </FilterSection>

            <FilterSection title={t.seller}>
              {allMerchants.map((s) => (
                <FilterChip
                  key={s}
                  label={s}
                  count={merchantCounts[s] || 0}
                  active={filters.merchants.includes(s)}
                  onClick={() => { setFilters((f) => ({ ...f, merchants: toggleArray(f.merchants, s) })); resetPage(); }}
                />
              ))}
            </FilterSection>

            <FilterSection title={t.price}>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  placeholder={t.minPrice}
                  value={filters.minPrice ?? ""}
                  onChange={(e) => { setFilters((f) => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : null })); resetPage(); }}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-foreground/30 text-[10px]">—</span>
                <input
                  type="number"
                  placeholder={t.maxPrice}
                  value={filters.maxPrice ?? ""}
                  onChange={(e) => { setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : null })); resetPage(); }}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-[10px] font-body text-foreground/30">€</span>
              </div>
            </FilterSection>

            <FilterSection title={t.discountPercent}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t.minDiscount}
                  value={filters.minDiscount ?? ""}
                  onChange={(e) => { setFilters((f) => ({ ...f, minDiscount: e.target.value ? Number(e.target.value) : null })); resetPage(); }}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-[10px] font-body text-foreground/30">%</span>
              </div>
            </FilterSection>
          </div>
        </div>
      )}

      <p className="font-body text-xs text-foreground/50 mb-6">
        {filtered.length} deals — page {currentPage}/{totalPages || 1}
      </p>

      {filtered.length === 0 ? (
        <p className="font-body text-sm text-foreground/40 text-center py-16">{t.noResults}</p>
      ) : (
        <>
          {children(paginatedDeals)}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 pb-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="text-[10px] font-display uppercase tracking-wider px-4 py-2 border border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`text-[10px] font-display w-8 h-8 flex items-center justify-center border transition-colors ${
                      pageNum === currentPage
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="text-[10px] font-display uppercase tracking-wider px-4 py-2 border border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DealFilters;
