import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { Deal } from "@/lib/data";
import { useMemo, useEffect, useState } from "react";

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
                className="group flex items-center gap-2 min-w-fit shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-200"
              >
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: Math.min(Math.ceil(count / 5), 3) }).map((_, i) => (
                    <Flame
                      key={i}
                      className={`w-3.5 h-3.5 animate-pulse ${
                        Math.min(Math.ceil(count / 5), 3) >= 3
                          ? "text-orange-500 fill-orange-500/50"
                          : Math.min(Math.ceil(count / 5), 3) >= 2
                          ? "text-amber-500 fill-amber-500/40"
                          : "text-foreground/50 fill-foreground/10"
                      }`}
                      strokeWidth={1.8}
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                <span className="font-display text-[10px] uppercase tracking-wider text-foreground">
                  {name}
                </span>
                <span className="text-[8px] font-body text-foreground/30">
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
