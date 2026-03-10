import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { categoryList } from "@/lib/data";

const Footer = () => {
  const { t } = useI18n();

  const categoryKeys = {
    sneakers: t.sneakers,
    jackets: t.jackets,
    hoodies: t.hoodies,
    tshirts: t.tshirts,
    pants: t.pants,
    accessories: t.accessories,
  };

  return (
    <footer className="bg-foreground text-background/70">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-display text-lg text-background mb-3 tracking-wider">GOLDDEALS CLUB</h3>
            <p className="text-xs font-body leading-relaxed text-background/50">{t.footerTagline}</p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="font-display text-[11px] uppercase tracking-[0.2em] text-background/40 mb-4">{t.footerNav}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-xs font-body text-background/60 hover:text-background transition-colors">{t.home}</Link>
              <Link to="/favorites" className="text-xs font-body text-background/60 hover:text-background transition-colors">{t.favorites}</Link>
              <Link to="/trends" className="text-xs font-body text-background/60 hover:text-background transition-colors">{t.trends}</Link>
              <Link to="/sellers" className="text-xs font-body text-background/60 hover:text-background transition-colors">{t.sellers}</Link>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display text-[11px] uppercase tracking-[0.2em] text-background/40 mb-4">{t.footerCategories}</h4>
            <div className="flex flex-col gap-2">
              {categoryList.map((cat) => (
                <Link key={cat.key} to={`/category/${cat.key}`} className="text-xs font-body text-background/60 hover:text-background transition-colors">
                  {categoryKeys[cat.key]}
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display text-[11px] uppercase tracking-[0.2em] text-background/40 mb-4">{t.newsletter}</h4>
            <p className="text-xs font-body text-background/50 mb-4">{t.newsletterSub}</p>
            <div className="flex">
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                className="flex-1 bg-transparent border border-background/20 px-3 py-2 text-xs font-body text-background placeholder:text-background/30 focus:outline-none focus:border-background/40"
              />
              <button className="bg-background text-foreground px-4 py-2 text-[10px] font-display uppercase tracking-widest hover:bg-background/90 transition-colors">
                {t.subscribe}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-body text-background/30">© 2026 GOLDDEALS CLUB. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-body text-background/30 hover:text-background/60 transition-colors">{t.footerAbout}</a>
            <a href="#" className="text-[10px] font-body text-background/30 hover:text-background/60 transition-colors">{t.footerContact}</a>
            <a href="#" className="text-[10px] font-body text-background/30 hover:text-background/60 transition-colors">{t.footerPrivacy}</a>
            <a href="#" className="text-[10px] font-body text-background/30 hover:text-background/60 transition-colors">{t.footerTerms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
