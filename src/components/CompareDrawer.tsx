import { createContext, useContext, useState, useCallback } from "react";
import { Deal } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { X, GitCompareArrows, ExternalLink } from "lucide-react";
import FlameIndicator from "./FlameIndicator";
import { trackOutboundClick } from "@/lib/track-click";
import { trackEvent } from "@/lib/track-event";

interface CompareContextType {
  items: Deal[];
  add: (deal: Deal) => void;
  remove: (id: string) => void;
  clear: () => void;
  isComparing: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType>({
  items: [],
  add: () => {},
  remove: () => {},
  clear: () => {},
  isComparing: () => false,
});

export const useCompare = () => useContext(CompareContext);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Deal[]>([]);

  const add = useCallback((deal: Deal) => {
    setItems((prev) => {
      if (prev.length >= 3 || prev.find((d) => d.id === deal.id)) return prev;
      trackEvent("compare_add", { dealId: deal.id });
      return [...prev, deal];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isComparing = useCallback((id: string) => items.some((d) => d.id === id), [items]);

  return (
    <CompareContext.Provider value={{ items, add, remove, clear, isComparing }}>
      {children}
      {items.length > 0 && <CompareBar />}
    </CompareContext.Provider>
  );
};

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "—";
  if (currency === "EUR") return `${price.toFixed(2)}€`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  return `${price.toFixed(2)} ${currency}`;
}

const CompareBar = () => {
  const { items, remove, clear } = useCompare();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground border-t border-primary-foreground/10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompareArrows className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[10px] font-display uppercase tracking-widest">
              {t.compare} ({items.length}/3)
            </span>
            <div className="flex items-center gap-2 ml-2">
              {items.map((deal) => (
                <div key={deal.id} className="flex items-center gap-1.5 bg-primary-foreground/10 px-2 py-1">
                  <img src={deal.image_url} alt="" className="w-6 h-6 object-cover" />
                  <span className="text-[9px] font-body max-w-[80px] truncate">{deal.brand}</span>
                  <button onClick={() => remove(deal.id)} className="p-0.5 hover:bg-primary-foreground/20 transition-colors">
                    <X className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clear}
              className="text-[9px] font-body text-primary-foreground/50 hover:text-primary-foreground underline transition-colors"
            >
              {t.clearAll}
            </button>
            {items.length >= 2 && (
              <button
                onClick={() => setExpanded(true)}
                className="bg-primary-foreground text-primary px-4 py-2 text-[10px] font-display uppercase tracking-wider hover:bg-primary-foreground/90 transition-colors"
              >
                {t.compareNow}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison overlay */}
      {expanded && (
        <div className="fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-foreground/8">
              <h2 className="font-display text-lg tracking-wider">{t.compare}</h2>
              <button onClick={() => setExpanded(false)} className="p-2 hover:bg-accent/50 transition-colors">
                <X className="w-4 h-4 text-foreground/50" strokeWidth={1.5} />
              </button>
            </div>

            <div className={`grid gap-px bg-foreground/8 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {items.map((deal) => (
                <div key={deal.id} className="bg-background p-4 flex flex-col">
                  <img src={deal.image_url} alt={deal.title} className="w-full aspect-square object-contain bg-photo p-2 mb-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-body uppercase tracking-wider text-foreground/40">{deal.merchant}</span>
                    <FlameIndicator count={deal.flame_count} className="scale-75" />
                  </div>
                  <h3 className="font-display text-xs tracking-wider mb-3 line-clamp-2">{deal.title}</h3>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="font-display text-lg">{formatPrice(deal.sale_price, deal.currency)}</span>
                    {deal.original_price && (
                      <span className="ml-2 font-body text-xs text-foreground/40 line-through">{formatPrice(deal.original_price, deal.currency)}</span>
                    )}
                  </div>

                  {/* Discount */}
                  {deal.discount_percent && (
                    <div className="bg-primary text-primary-foreground px-2 py-1 text-[10px] font-display tracking-wider inline-block w-fit mb-3">
                      -{deal.discount_percent}%
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5 mt-auto pt-3 border-t border-foreground/8 text-[10px] font-body text-foreground/60">
                    <div className="flex justify-between"><span>{t.brand}</span><span className="text-foreground">{deal.brand}</span></div>
                    <div className="flex justify-between"><span>{t.category}</span><span className="text-foreground capitalize">{deal.category}</span></div>
                    <div className="flex justify-between"><span>{t.seller}</span><span className="text-foreground">{deal.merchant}</span></div>
                  </div>

                  <a
                    href={deal.affiliate_url || deal.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { trackOutboundClick(deal.id, deal.affiliate_url || deal.product_url); trackEvent("merchant_redirect", { dealId: deal.id, metadata: { merchant: deal.merchant, source: "compare" } }); }}
                    className="mt-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-[10px] font-display uppercase tracking-wider hover:bg-foreground/80 transition-colors"
                  >
                    {t.seeOffer}
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompareBar;
