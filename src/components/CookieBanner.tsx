import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { useCookieConsent } from "@/lib/cookie-consent";

/**
 * GDPR-style consent banner. Appears when consent is "unset".
 * Editorial styling consistent with the luxury minimal aesthetic.
 */
const CookieBanner = () => {
  const { state, accept, reject } = useCookieConsent();

  if (state.analytics !== "unset") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-foreground/10 bg-background/98 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="container mx-auto px-4 py-5 md:py-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 lg:items-center">
          <div className="flex gap-3 flex-1">
            <Cookie className="w-4 h-4 mt-1 shrink-0 text-foreground/50" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="font-display text-[11px] uppercase tracking-[0.22em] text-foreground mb-2">
                Cookies & mesure d'audience
              </p>
              <p className="font-body text-xs md:text-[13px] text-foreground/60 leading-relaxed max-w-2xl">
                Nous utilisons des cookies de mesure pour suivre les clics sortants vers nos
                partenaires (Awin) et améliorer la sélection. Les cookies strictement nécessaires au
                fonctionnement du site sont toujours actifs.{" "}
                <Link
                  to="/privacy"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  En savoir plus
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={reject}
              className="px-4 md:px-5 py-2.5 border border-foreground/15 text-[10px] font-display uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={accept}
              className="px-4 md:px-6 py-2.5 bg-foreground text-background text-[10px] font-display uppercase tracking-[0.2em] hover:bg-foreground/85 transition-colors"
            >
              Accepter
            </button>
            <button
              onClick={reject}
              aria-label="Fermer (équivaut à refuser)"
              className="hidden md:inline-flex p-2 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
