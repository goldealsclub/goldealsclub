import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Heart, Menu, X } from "lucide-react";
import { useI18n, Lang } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { useGender } from "@/lib/gender-context";
import type { Gender } from "@/lib/data";
import logo from "@/assets/logo.png";

const languages: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

const Header = () => {
  const { t, lang, setLang } = useI18n();
  const { favorites } = useFavorites();
  const { gender, setGender } = useGender();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const genderTabs: { key: Gender | "all"; label: string }[] = [
    { key: "all", label: t.allDeals },
    { key: "men", label: t.men },
    { key: "women", label: t.women },
    { key: "kids", label: t.kids },
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
      {/* Gender bar */}
      <div className="border-b border-foreground/6 bg-muted/30">
        <div className="container mx-auto px-4 flex items-center justify-center gap-6 h-9">
          {genderTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setGender(tab.key)}
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
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile menu toggle */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="GOLDEALS CLUB" className="h-14 md:h-20 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
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

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2">
              <Search className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
            </button>

            {/* Favorites */}
            <Link to="/favorites" className="p-2 relative">
              <Heart className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
              {favorites.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-body flex items-center justify-center rounded-full">
                  {favorites.size}
                </span>
              )}
            </Link>

            {/* Language */}
            <div className="flex items-center gap-1 border-l border-foreground/10 pl-3 ml-1">
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

        {/* Search bar */}
        {searchOpen && (
          <div className="pb-4 animate-fade-in">
            <input
              type="text"
              placeholder={t.search}
              className="w-full bg-transparent border-b border-foreground/15 py-2 text-sm font-body placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-foreground/8 bg-background animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="text-xs font-display uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground py-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
