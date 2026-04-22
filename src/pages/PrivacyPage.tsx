import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCookieConsent } from "@/lib/cookie-consent";
import { toast } from "sonner";

const PrivacyPage = () => {
  const { state, accept, reject, reset } = useCookieConsent();

  const statusLabel =
    state.analytics === "accepted"
      ? "Mesure d'audience activée"
      : state.analytics === "rejected"
      ? "Mesure d'audience refusée"
      : "Choix non défini";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-8">Politique de Confidentialité</h1>

        <div className="space-y-8 font-body text-sm text-foreground/70 leading-relaxed">
          <section>
            <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Données collectées</h2>
            <p>Nous collectons uniquement les données nécessaires au bon fonctionnement du service : adresse email pour la newsletter, données de navigation anonymisées.</p>
          </section>

          <section>
            <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Utilisation</h2>
            <p>Vos données sont utilisées exclusivement pour vous envoyer des offres pertinentes et améliorer notre service. Nous ne vendons ni ne partageons vos informations personnelles.</p>
          </section>

          <section>
            <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Cookies & mesure d'audience</h2>
            <p className="mb-3">
              <strong className="text-foreground">Cookies essentiels</strong> (toujours actifs) : authentification,
              mémorisation des préférences (langue, favoris, thème).
            </p>
            <p className="mb-4">
              <strong className="text-foreground">Mesure d'audience (opt-in)</strong> : enregistrement des clics sortants
              vers nos partenaires (Awin) pour mesurer la performance des offres et améliorer la sélection. Aucun
              suivi publicitaire tiers.
            </p>

            <div className="border border-foreground/10 p-4 mt-4">
              <p className="text-[10px] font-display uppercase tracking-[0.2em] text-foreground/40 mb-2">
                État actuel
              </p>
              <p className="text-foreground mb-4">{statusLabel}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    accept();
                    toast.success("Mesure d'audience activée");
                  }}
                  disabled={state.analytics === "accepted"}
                  className="px-4 py-2 bg-foreground text-background text-[10px] font-display uppercase tracking-[0.2em] hover:bg-foreground/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Accepter
                </button>
                <button
                  onClick={() => {
                    reject();
                    toast.success("Mesure d'audience refusée");
                  }}
                  disabled={state.analytics === "rejected"}
                  className="px-4 py-2 border border-foreground/15 text-[10px] font-display uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Refuser
                </button>
                <button
                  onClick={() => {
                    reset();
                    toast.info("Préférences réinitialisées — la bannière va réapparaître");
                  }}
                  className="px-4 py-2 text-[10px] font-display uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Vos droits</h2>
            <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous à tout moment.</p>
          </section>

          <p className="text-xs text-foreground/40">Dernière mise à jour : avril 2026</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
