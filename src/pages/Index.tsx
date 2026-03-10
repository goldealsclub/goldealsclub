import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { categoryList, sellers, Deal, getLastUpdatedDate } from "@/lib/data";
import { useGender } from "@/lib/gender-context";
import DealCard from "@/components/DealCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.jpg";
import { ArrowRight, ShieldCheck } from "lucide-react";

function sortByDate(a: Deal, b: Deal): number {
  const dateA = new Date(a.promo_start_date || a.detected_at).getTime();
  const dateB = new Date(b.promo_start_date || b.detected_at).getTime();
  if (dateB !== dateA) return dateB - dateA;
  return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
}

/** Max items for homepage aperçu sections */
const PREVIEW_LIMIT = 4;

const Index = () => {
  const { t } = useI18n();
  const { filteredDeals: deals } = useGender();

  const hotDeals = deals.filter(d => d.deal_level === "hot-deal").sort(sortByDate);
  const bonDeals = deals.filter(d => d.deal_level === "bon-deal").sort(sortByDate);
  const promoNormales = deals.filter(d => d.deal_level === "promo-normale").sort(sortByDate);
  const popularDeals = [...deals].sort((a, b) => b.popularity - a.popularity);
  const newDeals = [...deals].sort(sortByDate);

  // Brand counters
  const brandCounts: Record<string, number> = {};
  deals.forEach(d => { brandCounts[d.brand] = (brandCounts[d.brand] || 0) + 1; });
  const brands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);

  const categoryKeys: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, pants: t.pants, accessories: t.accessories,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-end">
        <img src={heroImage} alt="Fashion editorial" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="relative container mx-auto px-4 pb-16 md:pb-24">
          <h1 className="font-display text-4xl md:text-7xl text-background tracking-wider mb-4">
            {t.heroTitle}
          </h1>
          <p className="font-body text-sm md:text-base text-background/70 max-w-lg mb-8 leading-relaxed">
            {t.heroSub}
          </p>
          <Link
            to="/category/all"
            className="inline-flex items-center gap-3 bg-background text-foreground px-8 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-background/90 transition-colors"
          >
            {t.heroCta}
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Brands bar */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-display uppercase tracking-widest text-foreground/40">{deals.length} deals —</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {brands.map(([brand, count]) => (
            <Link
              key={brand}
              to={`/brand/${encodeURIComponent(brand)}`}
              className="text-[11px] font-display uppercase tracking-wider border border-foreground/10 px-4 py-2 text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {brand} <span className="text-foreground/30 ml-1">({count})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hot Deals — APERÇU */}
      {hotDeals.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-2xl md:text-3xl tracking-wider">{t.hotDeals} 🔥</h2>
              <p className="font-body text-xs text-foreground/50 mt-2">{t.premiumSub}</p>
            </div>
            <Link to="/trends" className="text-[10px] font-display uppercase tracking-[0.15em] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1">
              {t.allDeals} ({hotDeals.length}) <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
            {hotDeals.slice(0, PREVIEW_LIMIT).map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="bg-sable/30">
        <div className="container mx-auto px-4 py-20">
          <h2 className="font-display text-2xl md:text-3xl tracking-wider mb-12">{t.categories}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-foreground/8">
            {categoryList.map((cat) => (
              <Link
                key={cat.key}
                to={`/category/${cat.key}`}
                className="group relative aspect-[3/4] overflow-hidden bg-background"
              >
                <img src={cat.image} alt={categoryKeys[cat.key]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                <div className="absolute inset-0 bg-foreground/20 group-hover:bg-foreground/40 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="font-display text-xs uppercase tracking-[0.2em] text-background">
                    {categoryKeys[cat.key]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bons Deals — APERÇU */}
      {bonDeals.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="flex items-end justify-between mb-12">
            <h2 className="font-display text-2xl md:text-3xl tracking-wider">{t.goodDeals}</h2>
            <Link to="/trends" className="text-[10px] font-display uppercase tracking-[0.15em] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1">
              {t.allDeals} ({bonDeals.length}) <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
            {bonDeals.slice(0, PREVIEW_LIMIT).map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* Popular — APERÇU */}
      <section className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-12">
          <h2 className="font-display text-2xl md:text-3xl tracking-wider">{t.popular}</h2>
          <Link to="/trends" className="text-[10px] font-display uppercase tracking-[0.15em] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1">
            {t.allDeals} ({deals.length}) <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
          {popularDeals.slice(0, PREVIEW_LIMIT).map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </section>

      {/* Promos Normales — APERÇU */}
      {promoNormales.length > 0 && (
        <section className="bg-sable/30">
          <div className="container mx-auto px-4 py-20">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-display text-2xl md:text-3xl tracking-wider">{t.normalPromos}</h2>
              <Link to="/trends" className="text-[10px] font-display uppercase tracking-[0.15em] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1">
                {t.allDeals} ({promoNormales.length}) <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/8">
              {promoNormales.slice(0, 3).map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Deals — APERÇU */}
      <section className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-12">
          <h2 className="font-display text-2xl md:text-3xl tracking-wider">{t.newDeals}</h2>
          <Link to="/trends" className="text-[10px] font-display uppercase tracking-[0.15em] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1">
            {t.allDeals} ({deals.length}) <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
          {newDeals.slice(0, PREVIEW_LIMIT).map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </section>

      {/* Trusted Sellers */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-2xl md:text-3xl tracking-wider mb-3">{t.trustedSellers}</h2>
        <p className="font-body text-xs text-foreground/50 mb-12">{t.trustedSellersSub}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sellers.map((seller) => (
            <div key={seller.name} className="border border-foreground/8 p-6 flex flex-col items-center gap-3 hover:border-foreground/20 transition-colors">
              <ShieldCheck className="w-6 h-6 text-foreground/30" strokeWidth={1.5} />
              <span className="font-display text-xs uppercase tracking-wider">{seller.name}</span>
              <span className="font-body text-[10px] text-foreground/40">{seller.dealCount} deals</span>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-2xl md:text-3xl tracking-wider mb-3">{t.newsletter}</h2>
          <p className="font-body text-xs text-primary-foreground/60 mb-8 max-w-md mx-auto">{t.newsletterSub}</p>
          <div className="flex max-w-md mx-auto">
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              className="flex-1 bg-transparent border border-primary-foreground/20 px-4 py-3 text-xs font-body text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:border-primary-foreground/50"
            />
            <button className="bg-primary-foreground text-primary px-6 py-3 text-[10px] font-display uppercase tracking-widest hover:bg-primary-foreground/90 transition-colors">
              {t.subscribe}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
