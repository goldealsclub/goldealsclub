import { useParams } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { deals, Category } from "@/lib/data";
import DealCard from "@/components/DealCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type SortKey = "discount" | "popularity" | "newest";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [sort, setSort] = useState<SortKey>("popularity");

  const categoryKeys: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, pants: t.pants, accessories: t.accessories,
  };

  const categoryName = categoryKeys[slug || ""] || slug;
  const filtered = deals.filter((d) => d.category === (slug as Category));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "discount") return b.discount - a.discount;
    if (sort === "popularity") return b.popularity - a.popularity;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "discount", label: t.discount },
    { key: "popularity", label: t.popularity },
    { key: "newest", label: t.newest },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{categoryName}</h1>
        <p className="font-body text-xs text-foreground/50 mb-8">{sorted.length} deals</p>

        {/* Sort */}
        <div className="flex items-center gap-4 mb-8 border-b border-foreground/8 pb-4">
          <span className="text-[10px] font-display uppercase tracking-widest text-foreground/40">{t.sortBy}</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 transition-colors ${
                sort === opt.key ? "bg-primary text-primary-foreground" : "text-foreground/40 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Asymmetric grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/8">
          {sorted.map((deal, i) => (
            <DealCard key={deal.id} deal={deal} featured={i === 0} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CategoryPage;
