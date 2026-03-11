import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPage = () => (
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
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Cookies</h2>
          <p>Nous utilisons des cookies essentiels pour le fonctionnement du site et la mémorisation de vos préférences (langue, favoris).</p>
        </section>

        <section>
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Vos droits</h2>
          <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous à tout moment.</p>
        </section>

        <p className="text-xs text-foreground/40">Dernière mise à jour : mars 2026</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPage;
