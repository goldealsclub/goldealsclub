import { useI18n } from "@/lib/i18n";
import { sellers } from "@/lib/data";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

const SellersPage = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-3">{t.trustedSellers}</h1>
        <p className="font-body text-xs text-foreground/50 mb-12">{t.trustedSellersSub}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <div key={seller.name} className="border border-foreground/8 p-8 flex flex-col items-center gap-4 hover:border-foreground/20 transition-colors">
              <ShieldCheck className="w-8 h-8 text-foreground/25" strokeWidth={1.5} />
              <span className="font-display text-sm uppercase tracking-wider">{seller.name}</span>
              <span className="font-body text-[11px] text-foreground/40">{seller.dealCount} deals</span>
              {seller.trusted && (
                <span className="text-[9px] font-body border border-foreground/15 px-2 py-0.5 uppercase tracking-wider text-foreground/40">
                  {t.trustedBadge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SellersPage;
