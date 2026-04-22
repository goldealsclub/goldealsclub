import { Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PromoCodeBadge from "@/components/PromoCodeBadge";
import { getAllActivePromos } from "@/lib/promo-codes";

const PromoCodesPage = () => {
  const promos = getAllActivePromos();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Codes promo — GOLDEALS CLUB"
        description="Tous les codes promo actifs chez nos vendeurs partenaires : Sport Is Good et plus encore."
        canonical="https://goldealsclub.lovable.app/codes-promo"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          Retour
        </Link>

        <header className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 text-[10px] font-display uppercase tracking-[0.25em] text-foreground/50">
            <Tag className="w-3.5 h-3.5" strokeWidth={1.5} />
            Codes promo actifs
          </div>
          <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-4">
            Économisez encore plus
          </h1>
          <p className="font-body text-sm text-foreground/60 leading-relaxed">
            Une sélection de codes promo négociés chez nos vendeurs partenaires. Cliquez sur un
            code pour le copier, puis collez-le au moment du paiement.
          </p>
        </header>

        {promos.length === 0 ? (
          <p className="font-body text-sm text-foreground/50">
            Aucun code promo actif pour le moment. Revenez bientôt.
          </p>
        ) : (
          <div className="space-y-12">
            {promos.map((merchant) => (
              <section key={merchant.merchantMatch}>
                <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-foreground/10">
                  <h2 className="font-display text-xl tracking-wider">{merchant.merchantName}</h2>
                  <span className="text-[10px] font-body uppercase tracking-wider text-foreground/40">
                    {merchant.codes.length} code{merchant.codes.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {merchant.codes.map((code) => (
                    <PromoCodeBadge key={code.code} code={code} variant="full" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PromoCodesPage;
