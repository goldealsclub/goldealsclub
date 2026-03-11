import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-8">Conditions d'Utilisation</h1>
      
      <div className="space-y-8 font-body text-sm text-foreground/70 leading-relaxed">
        <section>
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Objet</h2>
          <p>GOLDEALS CLUB est un service de curation de bons plans mode. Nous ne vendons aucun produit directement. Les liens mènent vers des sites marchands tiers.</p>
        </section>

        <section>
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Responsabilité</h2>
          <p>Les prix, disponibilités et conditions de vente affichés sont fournis par les sites marchands partenaires. GOLDEALS CLUB ne peut être tenu responsable des variations de prix ou de la disponibilité des produits.</p>
        </section>

        <section>
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Propriété intellectuelle</h2>
          <p>Le contenu éditorial, le design et la marque GOLDEALS CLUB sont protégés. Les images produits appartiennent à leurs marques et vendeurs respectifs.</p>
        </section>

        <section>
          <h2 className="font-display text-base uppercase tracking-wider mb-3 text-foreground">Liens affiliés</h2>
          <p>Certains liens présents sur le site peuvent être des liens affiliés. Cela n'affecte en rien le prix pour vous et nous aide à maintenir le service.</p>
        </section>

        <p className="text-xs text-foreground/40">Dernière mise à jour : mars 2026</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default TermsPage;
