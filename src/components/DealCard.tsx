import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ExternalLink, Star, Clock, GitCompareArrows } from "lucide-react";
import { Deal, isTrustedMerchant } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { useCompare } from "./CompareDrawer";
import FlameIndicator from "./FlameIndicator";
import ShareMenu from "./ShareMenu";
import { trackOutboundClick, buildAwinUrl } from "@/lib/track-click";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useDealVotes } from "@/hooks/use-deal-votes";
import { getPromoCodesForMerchant, getBestPromoForMerchant, applyPromoToPrice } from "@/lib/promo-codes";
import PromoCodeBadge from "./PromoCodeBadge";

interface DealCardProps {
  deal: Deal;
  featured?: boolean;
}

function formatCurrency(price: number | null, currency: string): string {
  if (price === null) return "";
  if (currency === "EUR") return `${price.toFixed(2)}€`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  if (currency === "GBP") return `£${price.toFixed(2)}`;
  return `${price.toFixed(2)} ${currency}`;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const DealCard = ({ deal, featured = false }: DealCardProps) => {
  const { t } = useI18n();
  const { toggle, isFav } = useFavorites();
  const { add, isComparing } = useCompare();
  const { score, userVote, vote } = useDealVotes(deal.id);
  const saved = isFav(deal.id);
  const comparing = isComparing(deal.id);
  const trusted = isTrustedMerchant(deal.merchant);
  const promoCodes = getPromoCodesForMerchant(deal.merchant);
  const bestPromo = getBestPromoForMerchant(deal.merchant);
  const promoPrice = applyPromoToPrice(deal.sale_price, bestPromo);
  const startDate = formatDate(deal.promo_start_date);
  const endDate = formatDate(deal.promo_end_date);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isSnipesImage = deal.image_url?.includes("asset.snipes.com");
  const isNikeImage = deal.image_url?.includes("static.nike.com") || deal.brand?.toLowerCase() === "nike";

  // image_url is already normalized in src/lib/data.ts (HD upgrades, productserve→sportspar fix)
  const enhancedImageUrl = deal.image_url;

  // Detect broken Snipes images that show brand logo instead of product
  const [imageBroken, setImageBroken] = useState(false);

  const imageFitClass = isSnipesImage
    ? "object-cover object-center scale-[1.05] group-hover:scale-[1.1]"
    : isNikeImage
      ? "object-cover object-center scale-[1.12] group-hover:scale-[1.18]"
      : "object-cover object-center group-hover:scale-[1.03]";

  return (
    <div className={`group relative border border-foreground/8 bg-background transition-all duration-300 ${featured ? "col-span-2 row-span-2" : ""}`}>
      {/* Image */}
      <Link to={`/deal/${deal.id}`} className="block relative overflow-hidden aspect-square bg-photo">
        {/* Skeleton shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-photo animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent animate-[shimmer_1.5s_infinite]" />
          </div>
        )}
        <img
          src={enhancedImageUrl}
          alt={deal.title}
          className={`w-full h-full transition-all duration-500 ${imageFitClass} ${imageLoaded && !imageBroken ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            // Detect tiny placeholder images (Snipes brand logos are typically very small or wrong aspect)
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setImageLoaded(true);
            }
          }}
          onError={(e) => {
            setImageBroken(true);
            const img = e.target as HTMLImageElement;
            img.src = "/placeholder.svg";
            setImageLoaded(true);
          }}
        />
        {/* Fallback for broken images */}
        {imageBroken && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <span className="font-display text-xs uppercase tracking-wider text-foreground/30">{deal.brand}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-foreground/10">
          <span className="bg-primary text-primary-foreground px-6 py-3 text-[10px] font-display uppercase tracking-[0.2em]">
            {t.seeOffer}
          </span>
        </div>
        {/* Discount badge */}
        {deal.discount_percent && deal.discount_percent > 0 && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-display tracking-wider">
            -{deal.discount_percent}%
          </div>
        )}
        {/* Super deal badge */}
        {deal.is_super_deal && (
          <div className="absolute top-3 left-3 mt-8 bg-accent text-accent-foreground px-2 py-0.5 text-[9px] font-display uppercase tracking-wider flex items-center gap-1">
            <Star className="w-3 h-3" strokeWidth={1.5} />
            Super Deal
          </div>
        )}
        {/* Category & Gender badges */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {deal.category && (
            <div className="bg-primary/80 backdrop-blur-sm text-primary-foreground px-2 py-0.5 text-[9px] font-body uppercase tracking-wider">
              {deal.category}
            </div>
          )}
          {deal.gender_label && (
            <div className="bg-muted/80 backdrop-blur-sm text-foreground/60 px-2 py-0.5 text-[9px] font-body uppercase tracking-wider border border-foreground/10">
              {deal.gender_label}
            </div>
          )}
        </div>
        {/* Flame indicator */}
        <div className="absolute top-3 right-3">
          <FlameIndicator count={deal.flame_count} />
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-body text-foreground/50 uppercase tracking-wider">{deal.merchant}</span>
          {trusted && (
            <span className="text-[9px] font-body text-foreground/40 border border-foreground/15 px-1.5 py-0.5 uppercase tracking-wider">
              {t.trustedBadge}
            </span>
          )}
          {deal.source && (
            <span className="text-[9px] font-body text-foreground/30 ml-auto">{deal.source}</span>
          )}
        </div>

        <Link to={`/deal/${deal.id}`}>
          <h3 className="font-display text-sm uppercase tracking-wide leading-tight mb-3 group-hover:text-foreground/70 transition-colors">
            {deal.title}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-display text-lg">{formatCurrency(deal.sale_price, deal.currency)}</span>
          {deal.original_price && (
            <span className="font-body text-sm text-foreground/40 line-through">{formatCurrency(deal.original_price, deal.currency)}</span>
          )}
        </div>

        {promoCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {promoCodes.map((code) => (
              <PromoCodeBadge key={code.code} code={code} variant="compact" />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-foreground/8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggle(deal.id)}
              className="p-2 hover:bg-accent/50 rounded-sm transition-colors"
              aria-label={t.save}
            >
              <motion.div whileTap={{ scale: 1.4 }} transition={{ type: "spring", stiffness: 400 }}>
                <Heart
                  className={`w-4 h-4 transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground/40 group-hover:text-foreground"}`}
                  strokeWidth={1.5}
                />
              </motion.div>
            </button>
            <ShareMenu url={`/deal/${deal.id}`} title={deal.title} />
            <button
              onClick={() => add(deal)}
              className={`p-2 hover:bg-accent/50 rounded-sm transition-colors ${comparing ? "text-foreground" : "text-foreground/40"}`}
              aria-label={t.addToCompare}
              title={t.addToCompare}
            >
              <GitCompareArrows className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-0.5 ml-1">
              <button onClick={() => vote(1)} className={`p-1 rounded-sm transition-colors ${userVote === 1 ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"}`}>
                <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              {score !== 0 && <span className="text-[10px] font-body text-foreground/50 min-w-[1ch] text-center">{score}</span>}
              <button onClick={() => vote(-1)} className={`p-1 rounded-sm transition-colors ${userVote === -1 ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"}`}>
                <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <a
            href={buildAwinUrl(deal.affiliate_url || deal.product_url, deal.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutboundClick(deal.id, deal.affiliate_url || deal.product_url)}
            className="inline-flex items-center gap-1.5 text-[10px] font-display uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors"
          >
            {t.seeOffer}
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DealCard;
