import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { deals } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ open, onClose }: SearchOverlayProps) => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return deals
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.merchant.toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm animate-fade-in">
      <div className="container mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 border-b border-foreground/15 pb-3">
          <Search className="w-5 h-5 text-foreground/40" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="flex-1 bg-transparent text-lg font-body placeholder:text-foreground/30 focus:outline-none"
          />
          <button onClick={onClose} className="p-2 hover:bg-accent/50 transition-colors">
            <X className="w-5 h-5 text-foreground/50" strokeWidth={1.5} />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="mt-6">
            {results.length === 0 ? (
              <p className="text-sm font-body text-foreground/40 text-center py-12">{t.noResults}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-4">
                  {results.length} {results.length === 1 ? "résultat" : "résultats"}
                </p>
                {results.map((deal) => (
                  <Link
                    key={deal.id}
                    to={`/deal/${deal.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 hover:bg-accent/30 transition-colors"
                  >
                    <img
                      src={deal.image_url}
                      alt={deal.title}
                      className="w-14 h-14 object-cover flex-shrink-0 bg-muted"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-body text-foreground/40 uppercase tracking-wider">
                        {deal.brand} · {deal.merchant}
                      </p>
                      <p className="font-display text-sm tracking-wide truncate">{deal.title}</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        {deal.sale_price && (
                          <span className="font-display text-sm">{deal.sale_price.toFixed(2)}€</span>
                        )}
                        {deal.original_price && (
                          <span className="font-body text-xs text-foreground/40 line-through">
                            {deal.original_price.toFixed(2)}€
                          </span>
                        )}
                        {deal.discount_percent && deal.discount_percent > 0 && (
                          <span className="text-[10px] font-body text-foreground/50">
                            -{deal.discount_percent}%
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <p className="text-sm font-body text-foreground/30 text-center py-16">
            Tapez au moins 2 caractères pour rechercher
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
