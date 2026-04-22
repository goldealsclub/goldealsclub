import { ArrowUpRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { trackOutboundClick } from "@/lib/track-click";

/**
 * Editorial banner promoting the FIFA World Cup 2026 national team jerseys
 * available at Sport Is Good (Awin partner). Two CTAs (adidas / Puma) link
 * directly to the merchant category pages and surface the SIG5 promo code.
 */

const ADIDAS_URL =
  "https://sportisgood.fr/football/equipes/equipes-nationales?brand=adidas&utm_source=goldealsclub&utm_medium=affiliate&utm_campaign=worldcup2026";
const PUMA_URL =
  "https://sportisgood.fr/football/equipes/equipes-nationales?brand=Puma&utm_source=goldealsclub&utm_medium=affiliate&utm_campaign=worldcup2026";

const handleClick = (brand: "adidas" | "puma", url: string) => {
  trackOutboundClick(`worldcup-2026-${brand}`, url);
};

const WorldCupBanner = () => {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="relative overflow-hidden border border-foreground/10 bg-foreground text-background">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-px bg-background/10">
          {/* Left — editorial pitch */}
          <div className="bg-foreground p-10 md:p-14 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-6 text-[10px] font-display uppercase tracking-[0.25em] text-background/50">
              <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} />
              Édition spéciale
            </div>
            <h2 className="font-display text-3xl md:text-5xl tracking-wider mb-5 leading-[1.05]">
              Maillots Coupe du Monde 2026
            </h2>
            <p className="font-body text-sm md:text-base text-background/60 leading-relaxed max-w-lg mb-8">
              Les sélections nationales adidas & Puma sont disponibles chez Sport Is Good.
              Profitez de <span className="text-background">-5%</span> supplémentaires avec le code{" "}
              <span className="font-display tracking-wider text-background">SIG5</span> au moment du paiement.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ADIDAS_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => handleClick("adidas", ADIDAS_URL)}
                className="group inline-flex items-center justify-between gap-4 bg-background text-foreground px-6 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-background/90 transition-colors"
              >
                Maillots adidas
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </a>
              <a
                href={PUMA_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => handleClick("puma", PUMA_URL)}
                className="group inline-flex items-center justify-between gap-4 border border-background/30 text-background px-6 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:border-background hover:bg-background/5 transition-colors"
              >
                Maillots Puma
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </a>
            </div>

            <p className="mt-6 text-[10px] font-body uppercase tracking-[0.18em] text-background/30">
              <Link to="/coupe-du-monde-2026" className="hover:text-background/60 transition-colors">
                En savoir plus →
              </Link>
              <span className="mx-2 text-background/15">·</span>
              En partenariat avec Sport Is Good · Lien affilié
            </p>
          </div>

          {/* Right — code promo highlight */}
          <div className="bg-foreground p-10 md:p-14 flex flex-col justify-center items-start lg:border-l lg:border-background/10">
            <span className="text-[10px] font-display uppercase tracking-[0.25em] text-background/40 mb-4">
              Code promo cumulable
            </span>
            <div className="font-display text-6xl md:text-7xl tracking-[0.15em] text-background mb-3">
              SIG5
            </div>
            <div className="font-display text-2xl md:text-3xl tracking-wider text-background/80 mb-6">
              −5%
            </div>
            <p className="font-body text-xs text-background/50 leading-relaxed max-w-xs">
              Valable sur l'ensemble du site Sport Is Good. À saisir lors du paiement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldCupBanner;
