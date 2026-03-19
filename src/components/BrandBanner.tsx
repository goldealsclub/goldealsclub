import { Link } from "react-router-dom";
import { Deal } from "@/lib/data";
import { useMemo, useEffect, useState } from "react";
import brandNike from "@/assets/brand-nike.svg";
import brandAdidas from "@/assets/brand-adidas.svg";

const brandLogos: Record<string, string> = {
  Nike: brandNike,
  nike: brandNike,
  Adidas: brandAdidas,
  adidas: brandAdidas,
};

interface BrandBannerProps {
  deals: Deal[];
}

const BrandBanner = ({ deals }: BrandBannerProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brands = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d) => {
      counts[d.brand] = (counts[d.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [deals]);

  return (
    <section
      className={`border-b border-foreground/5 bg-background/60 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
        visible ? "max-h-14 opacity-100" : "max-h-0 opacity-0 border-b-0"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto py-2 scrollbar-hide">
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
