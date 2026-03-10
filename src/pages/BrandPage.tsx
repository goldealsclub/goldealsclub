import { useParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useGender } from "@/lib/gender-context";
import DealCard from "@/components/DealCard";
import DealFilters from "@/components/DealFilters";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMemo } from "react";

const BrandPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const { t } = useI18n();
  const { filteredDeals } = useGender();

  const brandName = decodeURIComponent(brand || "");
  const brandDeals = useMemo(
    () => filteredDeals.filter((d) => d.brand.toLowerCase() === brandName.toLowerCase()),
    [brandName, filteredDeals]
  );

  // Stats
  const genderCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  brandDeals.forEach((d) => {
    genderCounts[d.gender_label] = (genderCounts[d.gender_label] || 0) + 1;
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{brandName}</h1>
        <p className="font-body text-xs text-foreground/50 mb-4">
          {brandDeals.length} {brandDeals.length > 1 ? "produits" : "produit"} {brandName}
        </p>

        {/* Counters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(genderCounts).map(([label, count]) => (
            <span key={label} className="text-[10px] font-body text-foreground/50 border border-foreground/10 px-2 py-0.5">
              {label || "Non défini"}: {count}
            </span>
          ))}
          <span className="text-foreground/20 mx-1">|</span>
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span key={cat} className="text-[10px] font-body text-foreground/50 border border-foreground/10 px-2 py-0.5">
              {cat}: {count}
            </span>
          ))}
        </div>

        {/* All deals — NO LIMIT */}
        <DealFilters sourceDeals={brandDeals}>
          {(filtered) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
              {filtered.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </DealFilters>
      </div>
      <Footer />
    </div>
  );
};

export default BrandPage;
