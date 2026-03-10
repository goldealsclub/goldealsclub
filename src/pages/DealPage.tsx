import { useParams, Link } from "react-router-dom";
import { Heart, ArrowLeft, Eye, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { deals } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";
import FlameIndicator from "@/components/FlameIndicator";
import ShareMenu from "@/components/ShareMenu";
import DealCard from "@/components/DealCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const DealPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { toggle, isFav } = useFavorites();

  const deal = deals.find((d) => d.id === id);
  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-foreground/50">Deal not found.</p>
      </div>
    );
  }

  const saved = isFav(deal.id);
  const similar = deals.filter((d) => d.category === deal.category && d.id !== deal.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          {t.backToHome}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <img src={deal.image} alt={deal.name} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-display tracking-wider">
              -{deal.discount}%
            </div>
            <div className="absolute top-4 right-4">
              <FlameIndicator tier={deal.tier} />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-body uppercase tracking-wider text-foreground/50">{deal.seller}</span>
              {deal.sellerTrusted && (
                <span className="text-[9px] font-body border border-foreground/15 px-2 py-0.5 uppercase tracking-wider text-foreground/40">
                  {t.trustedBadge}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl tracking-wider mb-6">{deal.name}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl">{deal.price}€</span>
              <span className="font-body text-lg text-foreground/40 line-through">{deal.originalPrice}€</span>
              <span className="text-xs font-body text-foreground/50">(-{deal.discount}% {t.off})</span>
            </div>

            <p className="font-body text-sm text-foreground/60 leading-relaxed mb-8">{deal.description}</p>

            {/* CTA */}
            <a
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-foreground/80 transition-colors mb-6"
            >
              {t.seeOfferAt} {deal.seller}
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
            </a>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-6 border-t border-foreground/8">
              <button
                onClick={() => toggle(deal.id)}
                className="flex items-center gap-2 text-xs font-body text-foreground/50 hover:text-foreground transition-colors"
              >
                <Heart className={`w-4 h-4 ${saved ? "fill-foreground text-foreground" : ""}`} strokeWidth={1.5} />
                {t.save}
              </button>
              <ShareMenu url={`/deal/${deal.id}`} title={deal.name} />
              <div className="flex items-center gap-1 text-foreground/35 ml-auto">
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-body">{deal.popularity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-xl tracking-wider mb-8">{t.similarDeals}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
              {similar.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DealPage;
