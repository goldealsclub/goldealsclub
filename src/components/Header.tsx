import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, Menu, X, RefreshCw, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n, Lang } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { useGender } from "@/lib/gender-context";
import type { Gender } from "@/lib/data";
import { getLastUpdatedDate } from "@/lib/data";
import logo from "@/assets/logo.png";
import partnerSnipes from "@/assets/partner-snipes.png";
import partnerKappa from "@/assets/partner-kappa.png";
import BrandBanner from "@/components/BrandBanner";
import SearchOverlay from "@/components/SearchOverlay";
import AlertPreferences from "@/components/AlertPreferences";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const languages: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

const Header = () => {
  const { t, lang, setLang } = useI18n();
  const { favorites } = useFavorites();
  const { gender, setGender, filteredDeals } = useGender();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll with hysteresis to prevent jitter
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled((prev) => {
            if (prev && window.scrollY < 30) return false;
            if (!prev && window.scrollY > 80) return true;
            return prev;
          });
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHomePage = location.pathname === "/" || location.pathname === "/index";

  const handleGenderClick = (key: Gender | "all") => {
    setGender(key);
    if (isHomePage) {
      setTimeout(() => {
        document.getElementById("deals-section")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  const genderTabs: { key: Gender | "all"; label: string }[] = [
    { key: "all", label: t.all },
    { key: "homme", label: t.men },
    { key: "femme", label: t.women },
    { key: "enfant", label: t.kids },
  ];

  const navLinks = [
    { to: "/", label: t.home },
    { to: "/category/sneakers", label: t.sneakers },
    { to: "/category/jackets", label: t.jackets },
    { to: "/category/hoodies", label: t.hoodies },
    { to: "/trends", label: t.trends },
  ];


  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-foreground/8">
      {/* Collapsible top bars */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          scrolled ? "max-h-0 opacity-0" : "max-h-40 opacity-100"
        }`}
      >
        {/* Update date bar */}
        {getLastUpdatedDate() && (
          <div className="bg-primary/5 border-b border-foreground/6">
            <div className="container mx-auto px-4 flex items-center justify-center gap-1.5 h-7">
              <RefreshCw className="w-3 h-3 text-foreground/40" />
              <span className="text-[10px] font-body text-foreground/50">
                Deals actualisés le {format(new Date(getLastUpdatedDate()), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
        )}
        {/* Partner bar */}
        <div className="border-b border-foreground/6 bg-background">
          <div className="container mx-auto px-4 flex items-center justify-center gap-5 h-14">
            <span className="text-[10px] font-body text-foreground/40 tracking-wide">En partenariat avec</span>
            <span className="shrink-0">
              <img src={partnerSnipes} alt="Snipes" className="h-12 md:h-14 w-auto object-contain" />
            </span>
            <span className="text-foreground/20 text-sm">×</span>
            <span className="shrink-0">
              <img src={partnerKappa} alt="Kappa" className="h-11 md:h-12 w-auto object-contain" />
            </span>
          </div>
        </div>
      </div>

      {/* Gender bar - always visible */}
      <div className="border-b border-foreground/6 bg-muted/30">
        <div className="container mx-auto px-4 flex items-center justify-center gap-6 h-9">
          {genderTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleGenderClick(tab.key)}
              className={`text-[10px] font-display uppercase tracking-[0.2em] transition-colors ${
                gender === tab.key
                  ? "text-foreground"
                  : "text-foreground/35 hover:text-foreground/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between transition-all duration-300 ${
          scrolled ? "h-14 md:h-16" : "h-16 md:h-24"
        }`}>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>

          <Link to="/" className="flex-shrink-0">
            <img
              src={logo}
              alt="GOLDEALS CLUB"
              className={`transition-all duration-300 w-auto ${
                scrolled ? "h-20 md:h-28" : "h-28 md:h-44"
              }`}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[11px] font-display uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setSearchOpen(true)} className="p-2">
              <Search className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
            </button>

            <Link to="/favorites" className="p-2 relative">
              <Heart className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
              {favorites.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-body flex items-center justify-center rounded-full">
                  {favorites.size}
                </span>
              )}
            </Link>

            {user ? (
              <>
                <AlertPreferences />
                <button onClick={signOut} className="p-2" title="Se déconnecter">
                  <LogOut className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <Link to="/auth" className="p-2" title="Se connecter">
                <User className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
              </Link>
            )}

            <div className="hidden md:flex items-center gap-1 border-l border-foreground/10 pl-3 ml-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-1 transition-colors ${
                    lang === l.code ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-foreground/8 bg-background animate-fade-in">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="text-xs font-display uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground py-2.5 border-b border-foreground/5 last:border-0"
              >
                {link.label}
              </Link>
            ))}
            {/* Mobile language selector */}
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-foreground/5">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`text-[10px] font-display uppercase tracking-wider px-2 py-1 transition-colors ${
                    lang === l.code ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
      {!isHomePage && <BrandBanner deals={filteredDeals} />}
    </header>
  );
};

export default Header;
