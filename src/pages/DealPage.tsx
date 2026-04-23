import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Eye, ExternalLink, Star, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { deals, isTrustedMerchant } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import FlameIndicator from "@/components/FlameIndicator";
import ShareMenu from "@/components/ShareMenu";
import PriceAlertButton from "@/components/PriceAlertButton";
import DealCard from "@/components/DealCard";
import { trackOutboundClick, buildAwinUrl } from "@/lib/track-click";
import { trackEvent } from "@/lib/track-event";
import RecentlyViewed from "@/components/RecentlyViewed";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromoCodeBadge from "@/components/PromoCodeBadge";
import { getPromoCodesForMerchant, getBestPromoForMerchant, applyPromoToPrice } from "@/lib/promo-codes";

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
  const { addViewed } = useRecentlyViewed();

  const deal = deals.find((d) => d.id === id);

  useEffect(() => {
    if (deal) {
      addViewed(deal.id);
      trackEvent("deal_view", { dealId: deal.id, metadata: { brand: deal.brand, merchant: deal.merchant, category: deal.category } });
    }
  }, [deal?.id]);

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-foreground/50">Deal not found.</p>
      </div>
    );
  }

  const saved = isFav(deal.id);
  const trusted = isTrustedMerchant(deal.merchant);
  const promoCodes = getPromoCodesForMerchant(deal.merchant);
  const bestPromo = getBestPromoForMerchant(deal.merchant);
  const promoPrice = applyPromoToPrice(deal.sale_price, bestPromo);
  // Improved similar deals: prioritize same brand+category, then same brand, then same category
  const similar = deals
    .filter((d) => d.id !== deal.id)
    .map((d) => ({
      deal: d,
      score: (d.brand === deal.brand && d.category === deal.category ? 3 : 0)
        + (d.brand === deal.brand ? 2 : 0)
        + (d.category === deal.category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.deal);
  const endDate = deal.promo_end_date ? new Date(deal.promo_end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${deal.title} — GOLDEALS CLUB`}
        description={`${deal.title} à ${deal.sale_price}${deal.currency === "EUR" ? "€" : deal.currency} chez ${deal.merchant}. ${deal.discount_percent ? `-${deal.discount_percent}%` : ""}`}
        canonical={`https://goldealsclub.lovable.app/deal/${deal.id}`}
        image={deal.image_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: deal.title,
          image: deal.image_url,
          brand: { "@type": "Brand", name: deal.brand },
          offers: {
            "@type": "Offer",
            price: deal.sale_price,
            priceCurrency: deal.currency,
            availability: "https://schema.org/InStock",
            url: deal.affiliate_url || deal.product_url,
            seller: { "@type": "Organization", name: deal.merchant },
            ...(deal.original_price ? { priceValidUntil: deal.promo_end_date } : {}),
          },
        }}
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          {t.backToHome}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative aspect-square overflow-hidden bg-photo"
          >
            <img src={deal.image_url} alt={deal.title} className="w-full h-full object-contain" />
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
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="flex flex-col justify-center"
          >
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

            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
              <span className={`font-display text-3xl ${promoPrice ? "text-foreground/40 line-through" : ""}`}>
                {formatCurrency(deal.sale_price, deal.currency)}
              </span>
              {promoPrice && bestPromo && (
                <span className="font-display text-3xl text-foreground">
                  {formatCurrency(promoPrice, deal.currency)}
                </span>
              )}
              {deal.original_price && !promoPrice && (
                <span className="font-body text-lg text-foreground/40 line-through">{formatCurrency(deal.original_price, deal.currency)}</span>
              )}
              {deal.discount_percent && (
                <span className="text-xs font-body text-foreground/50">(-{deal.discount_percent}% {t.off})</span>
              )}
            </div>
            {promoPrice && bestPromo && (
              <p className="text-[11px] font-body text-foreground/50 mb-6">
                Prix estimé après application du code <span className="font-display tracking-wider text-foreground">{bestPromo.code}</span> ({bestPromo.discountLabel})
              </p>
            )}

            {endDate && (
              <div className="flex items-center gap-2 mb-4 text-foreground/50">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-xs font-body">Fin de promo : {endDate}</span>
              </div>
            )}

            {deal.description && (
              <p className="font-body text-sm text-foreground/60 leading-relaxed mb-8">{deal.description}</p>
            )}

            {promoCodes.length > 0 && (
              <div className="space-y-3 mb-8">
                {promoCodes.map((code) => (
                  <PromoCodeBadge key={code.code} code={code} variant="full" />
                ))}
              </div>
            )}

            {/* CTA */}
            <a
              href={buildAwinUrl(deal.affiliate_url || deal.product_url, deal.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { trackOutboundClick(deal.id, deal.affiliate_url || deal.product_url); trackEvent("merchant_redirect", { dealId: deal.id, metadata: { merchant: deal.merchant, source: "deal_page" } }); }}
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
              <ShareMenu url={`/deal/${deal.id}`} title={deal.title} dealId={deal.id} />
              <PriceAlertButton dealId={deal.id} dealTitle={deal.title} />
              <div className="flex items-center gap-1 text-foreground/35 ml-auto">
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-body">{deal.popularity}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Similar — "Vous aimerez aussi" */}
        {similar.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-xl tracking-wider mb-8">{t.youMayAlsoLike}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
              {similar.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          </div>
        )}

        {/* Recently viewed */}
        <RecentlyViewed excludeId={deal.id} />
      </div>
      <Footer />
    </div>
  );
};

export default DealPage;
