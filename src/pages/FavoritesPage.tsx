import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { deals } from "@/lib/data";
import DealCard from "@/components/DealCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Heart } from "lucide-react";
import { useLoadVotes } from "@/hooks/use-deal-votes";

const FavoritesPage = () => {
  const { t } = useI18n();
  const { favorites } = useFavorites();

  const favDeals = deals.filter((d) => favorites.has(d.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">{t.favorites}</h1>
        <p className="font-body text-xs text-foreground/50 mb-8">{favDeals.length} deals</p>

        {favDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Heart className="w-10 h-10 text-foreground/15 mb-4" strokeWidth={1.5} />
            <p className="font-body text-sm text-foreground/40">{t.noFavorites}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
            {favDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FavoritesPage;
