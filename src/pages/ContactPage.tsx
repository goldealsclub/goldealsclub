import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ContactPage = () => {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ title: "Message envoyé", description: "Nous reviendrons vers vous rapidement." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-8">Contact</h1>
        <p className="font-body text-sm text-foreground/60 mb-8">
          Vous pouvez aussi nous écrire directement à{" "}
          <a href="mailto:contact@goldealsclub.com" className="text-primary hover:underline">contact@goldealsclub.com</a>
        </p>

        {sent ? (
          <div className="text-center py-16">
            <Send className="w-8 h-8 text-foreground/20 mx-auto mb-4" strokeWidth={1.5} />
            <p className="font-body text-sm text-foreground/60">Merci ! Votre message a bien été envoyé.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-display uppercase tracking-widest text-foreground/50 mb-2 block">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full bg-transparent border border-foreground/15 px-4 py-3 text-sm font-body placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-display uppercase tracking-widest text-foreground/50 mb-2 block">
                Message
              </label>
              <textarea
                required
                rows={5}
                className="w-full bg-transparent border border-foreground/15 px-4 py-3 text-sm font-body placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40 resize-none"
                placeholder="Votre message..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-8 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-foreground/80 transition-colors"
            >
              Envoyer
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
