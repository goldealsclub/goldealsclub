import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, Eye, Heart } from "lucide-react";

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-8">À Propos</h1>
      
      <p className="font-body text-sm text-foreground/70 leading-relaxed mb-8">
        GOLDEALS CLUB est une plateforme de curation mode et streetwear premium. 
        Nous sélectionnons les meilleures offres chez des vendeurs tiers fiables — 
        sans vente directe, sans intermédiaire inutile.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { icon: Eye, title: "Sélection", desc: "Chaque deal est vérifié et sélectionné pour son rapport qualité-prix." },
          { icon: ShieldCheck, title: "Fiabilité", desc: "Uniquement des vendeurs reconnus et vérifiés." },
          { icon: Heart, title: "Passion", desc: "Une équipe passionnée par la mode et les bonnes affaires." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border border-foreground/8 p-6">
            <Icon className="w-6 h-6 text-foreground/30 mb-3" strokeWidth={1.5} />
            <h3 className="font-display text-sm uppercase tracking-wider mb-2">{title}</h3>
            <p className="font-body text-xs text-foreground/50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <p className="font-body text-xs text-foreground/40 leading-relaxed">
        GOLDEALS CLUB ne vend aucun produit directement. Nous vous redirigeons vers des boutiques 
        partenaires pour finaliser vos achats. Les prix et disponibilités sont susceptibles de varier.
      </p>
    </div>
    <Footer />
  </div>
);

export default AboutPage;
