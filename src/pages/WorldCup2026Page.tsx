import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Trophy, Copy, Check } from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { trackOutboundClick } from "@/lib/track-click";
import { toast } from "@/hooks/use-toast";

const ADIDAS_URL =
  "https://sportisgood.fr/football/equipes/equipes-nationales?brand=adidas&utm_source=goldealsclub&utm_medium=affiliate&utm_campaign=worldcup2026";
const PUMA_URL =
  "https://sportisgood.fr/football/equipes/equipes-nationales?brand=Puma&utm_source=goldealsclub&utm_medium=affiliate&utm_campaign=worldcup2026";

const PROMO_CODE = "SIG5";

const WorldCup2026Page = () => {
  const [copied, setCopied] = useState(false);

  const handleCta = (brand: "adidas" | "puma", url: string) => {
    trackOutboundClick(`worldcup-2026-${brand}-page`, url);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast({ title: "Code copié", description: `${PROMO_CODE} est dans votre presse-papiers.` });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Maillots Coupe du Monde 2026 — adidas & Puma | GOLDEALS CLUB"
        description="Découvrez les maillots officiels des sélections nationales adidas et Puma pour la Coupe du Monde 2026, disponibles chez Sport Is Good. -5% supplémentaires avec le code SIG5."
        canonical="https://goldealsclub.lovable.app/coupe-du-monde-2026"
      />
      <Header />

      <main className="flex-1">
        {/* Hero / intro */}
        <section className="bg-foreground text-background">
          <div className="container mx-auto px-4 py-20 md:py-28">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-background/40 hover:text-background transition-colors mb-10"
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
              Retour
            </Link>

            <div className="inline-flex items-center gap-2 mb-6 text-[10px] font-display uppercase tracking-[0.25em] text-background/50">
              <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} />
              Édition spéciale · Sport Is Good
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-wider leading-[1.05] max-w-4xl mb-8">
              Maillots Coupe du Monde 2026
            </h1>

            <p className="font-body text-base md:text-lg text-background/70 leading-relaxed max-w-2xl">
              L'ensemble des maillots adidas et Puma des sélections nationales pour la Coupe du Monde
              2026 sont disponibles sur Sport Is Good. Une sélection complète des équipes engagées,
              des modèles domicile aux versions extérieures.
            </p>
          </div>
        </section>

        {/* CTAs */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/8">
            <a
              href={ADIDAS_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handleCta("adidas", ADIDAS_URL)}
              className="group relative bg-background border border-foreground/10 p-10 md:p-14 flex flex-col justify-between min-h-[280px] hover:border-foreground/30 transition-colors"
            >
              <div>
                <span className="text-[10px] font-display uppercase tracking-[0.25em] text-foreground/40">
                  Sélections nationales
                </span>
                <h2 className="font-display text-3xl md:text-4xl tracking-wider mt-4">
                  Maillots adidas
                </h2>
                <p className="font-body text-sm text-foreground/60 mt-3 max-w-md">
                  Argentine, Allemagne, Espagne, Mexique, Japon et plus encore.
                </p>
              </div>
              <div className="inline-flex items-center justify-between gap-4 mt-8 text-[11px] font-display uppercase tracking-[0.2em]">
                Voir la sélection
                <ArrowUpRight
                  className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.5}
                />
              </div>
            </a>

            <a
              href={PUMA_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handleCta("puma", PUMA_URL)}
              className="group relative bg-background border border-foreground/10 p-10 md:p-14 flex flex-col justify-between min-h-[280px] hover:border-foreground/30 transition-colors"
            >
              <div>
                <span className="text-[10px] font-display uppercase tracking-[0.25em] text-foreground/40">
                  Sélections nationales
                </span>
                <h2 className="font-display text-3xl md:text-4xl tracking-wider mt-4">
                  Maillots Puma
                </h2>
                <p className="font-body text-sm text-foreground/60 mt-3 max-w-md">
                  Italie, Suisse, Maroc, Sénégal, Uruguay et plus encore.
                </p>
              </div>
              <div className="inline-flex items-center justify-between gap-4 mt-8 text-[11px] font-display uppercase tracking-[0.2em]">
                Voir la sélection
                <ArrowUpRight
                  className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.5}
                />
              </div>
            </a>
          </div>
        </section>

        {/* Promo code block */}
        <section className="container mx-auto px-4 pb-24">
          <div className="border border-foreground/10 bg-sable/30 p-10 md:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <span className="text-[10px] font-display uppercase tracking-[0.25em] text-foreground/40 mb-4 block">
                  Code promo cumulable
                </span>
                <h3 className="font-display text-2xl md:text-3xl tracking-wider mb-4">
                  −5% supplémentaires sur Sport Is Good
                </h3>
                <p className="font-body text-sm text-foreground/60 leading-relaxed max-w-xl">
                  Saisissez le code <span className="font-display tracking-wider text-foreground">SIG5</span>{" "}
                  au moment du paiement pour bénéficier d'une remise de 5% sur l'ensemble du site,
                  cumulable avec les promotions en cours sur les maillots des sélections nationales.
                </p>
              </div>

              <button
                onClick={copyCode}
                className="group flex items-center gap-4 border border-foreground bg-background px-8 py-6 hover:bg-foreground hover:text-background transition-colors"
                aria-label="Copier le code SIG5"
              >
                <div className="text-left">
                  <span className="block text-[10px] font-display uppercase tracking-[0.25em] text-foreground/40 group-hover:text-background/50 mb-1">
                    {copied ? "Copié" : "Cliquer pour copier"}
                  </span>
                  <span className="font-display text-3xl md:text-4xl tracking-[0.15em]">
                    {PROMO_CODE}
                  </span>
                </div>
                {copied ? (
                  <Check className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Copy className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          <p className="mt-8 text-[10px] font-body uppercase tracking-[0.18em] text-foreground/30 text-center">
            En partenariat avec Sport Is Good · Liens affiliés
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WorldCup2026Page;
