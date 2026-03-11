import { Link } from "react-router-dom";
import { Deal } from "@/lib/data";
import { useMemo, useEffect, useState } from "react";

/** Brand logo URLs (transparent PNGs from public CDNs) */
const brandLogos: Record<string, string> = {
  Nike: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png",
  Adidas: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/200px-Adidas_Logo.svg.png",
  Puma: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Puma_logo.svg/200px-Puma_logo.svg.png",
  "New Balance": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/New_Balance_logo.svg/200px-New_Balance_logo.svg.png",
  Reebok: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Reebok_2019_logo.svg/200px-Reebok_2019_logo.svg.png",
  Converse: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Converse_logo.svg/200px-Converse_logo.svg.png",
  Vans: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Vans-logo.svg/200px-Vans-logo.svg.png",
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
        <div className="flex items-center gap-5 overflow-x-auto py-2 scrollbar-hide">
          {brands.map(({ name, count }) => {
            const logo = brandLogos[name];
            return (
              <Link
                key={name}
                to={`/brand/${encodeURIComponent(name)}`}
                className="group flex flex-col items-center gap-1 min-w-[70px] shrink-0 opacity-40 hover:opacity-90 transition-opacity duration-200"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name}
                    className="h-5 w-auto object-contain dark:invert"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-display text-[10px] uppercase tracking-wider text-foreground">
                    {name}
                  </span>
                )}
                <span className="text-[8px] font-body text-foreground/25 group-hover:text-foreground/50 transition-colors">
                  {count} deals
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
