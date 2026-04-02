import { useI18n } from "@/lib/i18n";
import { useGender } from "@/lib/gender-context";
import DealCard from "@/components/DealCard";
import DealFilters from "@/components/DealFilters";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLoadVotes } from "@/hooks/use-deal-votes";
import DealCardSkeleton from "@/components/DealCardSkeleton";

const TrendsPage = () => {
  const { t } = useI18n();
  const { filteredDeals: deals, loading } = useGender();
  useLoadVotes(deals.slice(0, 50).map(d => d.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{t.trends}</h1>
        <p className="font-body text-xs text-foreground/50 mb-8">{t.premiumSub}</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
            {Array.from({ length: 12 }).map((_, i) => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <DealFilters sourceDeals={deals}>
            {(filtered) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
                {filtered.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
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

export default TrendsPage;
