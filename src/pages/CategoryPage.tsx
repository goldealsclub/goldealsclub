import { useParams, Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Category, categoryList } from "@/lib/data";
import { useGender } from "@/lib/gender-context";
import DealCard from "@/components/DealCard";
import DealFilters from "@/components/DealFilters";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMemo } from "react";
import { useLoadVotes } from "@/hooks/use-deal-votes";
import DealCardSkeleton from "@/components/DealCardSkeleton";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { filteredDeals, loading } = useGender();

  const categoryLabels: Record<string, string> = {
    sneakers: t.sneakers, hoodies: t.hoodies,
    "t-shirts": "T-shirts", pantalons: "Pantalons",
    accessoires: t.accessories, vestes: t.jackets,
    autres: "Autres", all: t.all,
  };

  const isAll = slug === "all";
  const categoryName = isAll ? t.allDeals : (categoryLabels[slug || ""] || slug);

  const categoryDeals = useMemo(
    () => isAll
      ? filteredDeals
      : filteredDeals.filter((d) => d.category === slug),
    [slug, filteredDeals, isAll]
  );

  // Get all unique categories from the full deal set for nav
  const allCategories = useMemo(() => {
    const cats = new Set(filteredDeals.map(d => d.category));
    return Array.from(cats);
  }, [filteredDeals]);

  // Batch-load votes for visible deals (first page)
  useLoadVotes(useMemo(() => categoryDeals.slice(0, 50).map(d => d.id), [categoryDeals]));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{categoryName}</h1>
        <p className="font-body text-xs text-foreground/50 mb-6">{loading ? "" : `${categoryDeals.length} deals`}</p>

        {/* Category navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            to="/category/all"
            className={`text-[10px] font-display uppercase tracking-wider px-4 py-2 border transition-colors ${
              isAll
                ? "bg-primary text-primary-foreground border-primary"
                : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {t.all} ({filteredDeals.length})
          </Link>
          {[...categoryList.map(c => c.key), "autres"].filter((cat, i, arr) => arr.indexOf(cat) === i).map((cat) => {
            const count = filteredDeals.filter(d => d.category === cat).length;
            if (count === 0) return null;
            return (
              <Link
                key={cat}
                to={`/category/${cat}`}
                className={`text-[10px] font-display uppercase tracking-wider px-4 py-2 border transition-colors ${
                  slug === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {categoryLabels[cat] || cat} ({count})
              </Link>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/8">
            {Array.from({ length: 12 }).map((_, i) => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <DealFilters sourceDeals={categoryDeals}>
            {(filtered) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/8">
                {filtered.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} featured={i === 0} />
                ))}
              </div>
            )}
          </DealFilters>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CategoryPage;
