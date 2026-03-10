import { useParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Category } from "@/lib/data";
import { useGender } from "@/lib/gender-context";
import DealCard from "@/components/DealCard";
import DealFilters from "@/components/DealFilters";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMemo } from "react";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { filteredDeals } = useGender();

  const categoryKeys: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, pants: t.pants, accessories: t.accessories,
  };

  const categoryName = categoryKeys[slug || ""] || slug;
  const categoryDeals = useMemo(() => filteredDeals.filter((d) => d.category === (slug as Category)), [slug, filteredDeals]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{categoryName}</h1>
        <p className="font-body text-xs text-foreground/50 mb-8">{categoryDeals.length} deals</p>

        <DealFilters sourceDeals={categoryDeals}>
          {(filtered) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/8">
              {filtered.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} featured={i === 0} />
              ))}
            </div>
          )}
        </DealFilters>
      </div>
      <Footer />
    </div>
  );
};

export default CategoryPage;
