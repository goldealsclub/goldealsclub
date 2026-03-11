import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Eye, ExternalLink, Star, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { deals, isTrustedMerchant } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import FlameIndicator from "@/components/FlameIndicator";
import ShareMenu from "@/components/ShareMenu";
import DealCard from "@/components/DealCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function formatCurrency(price: number | null, currency: string): string {
  if (price === null) return "";
  if (currency === "EUR") return `${price.toFixed(2)}€`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  if (currency === "GBP") return `£${price.toFixed(2)}`;
  return `${price.toFixed(2)} ${currency}`;
}

const DealPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
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
  const trusted = isTrustedMerchant(deal.merchant);
  const similar = deals.filter((d) => d.category === deal.category && d.id !== deal.id).slice(0, 4);
  const endDate = deal.promo_end_date ? new Date(deal.promo_end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          {t.backToHome}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
            {deal.discount_percent && deal.discount_percent > 0 && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-display tracking-wider">
                -{deal.discount_percent}%
              </div>
            )}
            {deal.is_super_deal && (
              <div className="absolute top-4 left-4 mt-10 bg-accent text-accent-foreground px-3 py-1 text-[10px] font-display uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3.5 h-3.5" strokeWidth={1.5} />
                Super Deal
              </div>
            )}
            <div className="absolute top-4 right-4">
              <FlameIndicator count={deal.flame_count} />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[10px] font-body uppercase tracking-wider text-foreground/50">{deal.merchant}</span>
              {trusted && (
                <span className="text-[9px] font-body border border-foreground/15 px-2 py-0.5 uppercase tracking-wider text-foreground/40">
                  {t.trustedBadge}
                </span>
              )}
              {deal.gender_label && (
                <span className="text-[9px] font-body border border-foreground/15 px-2 py-0.5 uppercase tracking-wider text-foreground/40">
                  {deal.gender_label}
                </span>
              )}
              {deal.source && (
                <span className="text-[9px] font-body text-foreground/30 ml-auto">
                  via {deal.source}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl tracking-wider mb-6">{deal.title}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl">{formatCurrency(deal.sale_price, deal.currency)}</span>
              {deal.original_price && (
                <span className="font-body text-lg text-foreground/40 line-through">{formatCurrency(deal.original_price, deal.currency)}</span>
              )}
              {deal.discount_percent && (
                <span className="text-xs font-body text-foreground/50">(-{deal.discount_percent}% {t.off})</span>
              )}
            </div>

            {endDate && (
              <div className="flex items-center gap-2 mb-4 text-foreground/50">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-xs font-body">Fin de promo : {endDate}</span>
              </div>
            )}

            {deal.description && (
              <p className="font-body text-sm text-foreground/60 leading-relaxed mb-8">{deal.description}</p>
            )}

            {/* CTA */}
            <a
              href={deal.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-foreground/80 transition-colors mb-6"
            >
              {t.seeOfferAt} {deal.merchant}
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
              <ShareMenu url={`/deal/${deal.id}`} title={deal.title} />
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
