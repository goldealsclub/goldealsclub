import { Link } from "react-router-dom";
import { Deal } from "@/lib/data";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import brandNike from "@/assets/brand-nike.svg";
import brandAdidas from "@/assets/brand-adidas.svg";

const brandLogos: Record<string, string> = {
  Nike: brandNike,
  nike: brandNike,
  Adidas: brandAdidas,
  adidas: brandAdidas,
};

const EXCLUDED_BANNER_BRANDS = new Set(["Snipes"]);

interface BrandBannerProps {
  deals: Deal[];
}

const BrandBanner = ({ deals }: BrandBannerProps) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const brands = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d) => {
      if (!d.brand || EXCLUDED_BANNER_BRANDS.has(d.brand)) return;
      counts[d.brand] = (counts[d.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [deals]);

  return (
    <section className="border-b border-foreground/5 bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-background via-background/90 to-transparent pl-1 pr-4 h-full flex items-center"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-foreground/60" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-background via-background/90 to-transparent pr-1 pl-4 h-full flex items-center"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-foreground/60" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 overflow-x-auto py-2 brand-scroll"
        >
          {brands.map(({ name, count }) => {
            const logo = brandLogos[name];
            return (
              <Link
                key={name}
                to={`/brand/${encodeURIComponent(name)}`}
                className="group flex items-center gap-2 min-w-fit shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-200"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="font-display text-[10px] uppercase tracking-wider text-foreground font-bold">
                    {name}
                  </span>
                )}
                <span className="text-[11px] font-body font-semibold text-foreground/60">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BrandBanner;
