import { useState, useMemo } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Deal, DealTier, Category, Gender, deals as allDealsData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import FlameIndicator from "./FlameIndicator";

export type SortKey = "discount" | "popularity" | "newest" | "priceAsc" | "priceDesc";

interface Filters {
  tier: DealTier | "all";
  categories: Category[];
  brands: string[];
  sellers: string[];
  colors: string[];
  genders: Gender[];
  minPrice: number | null;
  maxPrice: number | null;
  minDiscount: number | null;
}

const defaultFilters: Filters = {
  tier: "all",
  categories: [],
  brands: [],
  sellers: [],
  colors: [],
  genders: [],
  minPrice: null,
  maxPrice: null,
  minDiscount: null,
};

function getUniqueValues<T>(items: Deal[], key: keyof Deal): string[] {
  return [...new Set(items.map((d) => String(d[key])))].sort();
}

interface DealFiltersProps {
  sourceDeals: Deal[];
  children: (filtered: Deal[]) => React.ReactNode;
}

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
    }`}
  >
    {label}
  </button>
);

const FilterSection = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
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
  const [sort, setSort] = useState<SortKey>("popularity");
  const [showFilters, setShowFilters] = useState(false);

  const allBrands = useMemo(() => getUniqueValues(sourceDeals, "brand"), [sourceDeals]);
  const allSellers = useMemo(() => getUniqueValues(sourceDeals, "seller"), [sourceDeals]);
  const allColors = useMemo(() => getUniqueValues(sourceDeals, "color"), [sourceDeals]);

  const categoryKeys: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, pants: t.pants, accessories: t.accessories,
  };

  const genderKeys: Record<Gender, string> = {
    men: t.men, women: t.women, unisex: t.unisex,
  };

  const tierTabs: { key: DealTier | "all"; label: string }[] = [
    { key: "all", label: t.allPromos },
    { key: "standard", label: t.normalPromos },
    { key: "super", label: t.goodDeals },
    { key: "exceptional", label: t.hotDeals },
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
    (filters.tier !== "all" ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    filters.sellers.length +
    filters.colors.length +
    filters.genders.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.minDiscount !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let result = [...sourceDeals];

    if (filters.tier !== "all") result = result.filter((d) => d.tier === filters.tier);
    if (filters.categories.length) result = result.filter((d) => filters.categories.includes(d.category));
    if (filters.brands.length) result = result.filter((d) => filters.brands.includes(d.brand));
    if (filters.sellers.length) result = result.filter((d) => filters.sellers.includes(d.seller));
    if (filters.colors.length) result = result.filter((d) => filters.colors.includes(d.color));
    if (filters.genders.length) result = result.filter((d) => filters.genders.includes(d.gender));
    if (filters.minPrice !== null) result = result.filter((d) => d.price >= filters.minPrice!);
    if (filters.maxPrice !== null) result = result.filter((d) => d.price <= filters.maxPrice!);
    if (filters.minDiscount !== null) result = result.filter((d) => d.discount >= filters.minDiscount!);

    result.sort((a, b) => {
      if (sort === "discount") return b.discount - a.discount;
      if (sort === "popularity") return b.popularity - a.popularity;
      if (sort === "priceAsc") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [sourceDeals, filters, sort]);

  return (
    <div>
      {/* Tier tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tierTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilters((f) => ({ ...f, tier: tab.key }))}
            className={`flex items-center gap-2 text-[10px] font-display uppercase tracking-wider px-4 py-2 border transition-all whitespace-nowrap ${
              filters.tier === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {tab.key !== "all" && <FlameIndicator tier={tab.key} className="scale-90" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sort + filter toggle */}
      <div className="flex items-center justify-between border-b border-foreground/8 pb-4 mb-6">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-[10px] font-display uppercase tracking-widest text-foreground/40 whitespace-nowrap">{t.sortBy}</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
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
                  onClick={() => setFilters(defaultFilters)}
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
            {/* Category */}
            <FilterSection title={t.category} defaultOpen>
              {(["sneakers", "jackets", "hoodies", "tshirts", "pants", "accessories"] as Category[]).map((cat) => (
                <FilterChip
                  key={cat}
                  label={categoryKeys[cat]}
                  active={filters.categories.includes(cat)}
                  onClick={() => setFilters((f) => ({ ...f, categories: toggleArray(f.categories, cat) }))}
                />
              ))}
            </FilterSection>

            {/* Brand */}
            <FilterSection title={t.brand} defaultOpen>
              {allBrands.map((b) => (
                <FilterChip
                  key={b}
                  label={b}
                  active={filters.brands.includes(b)}
                  onClick={() => setFilters((f) => ({ ...f, brands: toggleArray(f.brands, b) }))}
                />
              ))}
            </FilterSection>

            {/* Seller */}
            <FilterSection title={t.seller}>
              {allSellers.map((s) => (
                <FilterChip
                  key={s}
                  label={s}
                  active={filters.sellers.includes(s)}
                  onClick={() => setFilters((f) => ({ ...f, sellers: toggleArray(f.sellers, s) }))}
                />
              ))}
            </FilterSection>

            {/* Color */}
            <FilterSection title={t.color}>
              {allColors.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={filters.colors.includes(c)}
                  onClick={() => setFilters((f) => ({ ...f, colors: toggleArray(f.colors, c) }))}
                />
              ))}
            </FilterSection>

            {/* Gender */}
            <FilterSection title={t.gender}>
              {(["men", "women", "unisex"] as Gender[]).map((g) => (
                <FilterChip
                  key={g}
                  label={genderKeys[g]}
                  active={filters.genders.includes(g)}
                  onClick={() => setFilters((f) => ({ ...f, genders: toggleArray(f.genders, g) }))}
                />
              ))}
            </FilterSection>

            {/* Price range */}
            <FilterSection title={t.price}>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  placeholder={t.minPrice}
                  value={filters.minPrice ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : null }))}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-foreground/30 text-[10px]">—</span>
                <input
                  type="number"
                  placeholder={t.maxPrice}
                  value={filters.maxPrice ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : null }))}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-[10px] font-body text-foreground/30">€</span>
              </div>
            </FilterSection>

            {/* Min discount */}
            <FilterSection title={t.discountPercent}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t.minDiscount}
                  value={filters.minDiscount ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, minDiscount: e.target.value ? Number(e.target.value) : null }))}
                  className="w-20 bg-transparent border border-foreground/15 px-2 py-1.5 text-[11px] font-body text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                />
                <span className="text-[10px] font-body text-foreground/30">%</span>
              </div>
            </FilterSection>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="font-body text-xs text-foreground/50 mb-6">{filtered.length} deals</p>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="font-body text-sm text-foreground/40 text-center py-16">{t.noResults}</p>
      ) : (
        children(filtered)
      )}
    </div>
  );
};

export default DealFilters;
