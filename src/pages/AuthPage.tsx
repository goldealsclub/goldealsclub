import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Heart, Bell, Smartphone, Shield, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  { icon: Heart, label: "Favoris synchronisés sur tous vos appareils" },
  { icon: Bell, label: "Alertes email des meilleurs deals quotidiens" },
  { icon: Zap, label: "Notifications en temps réel des Hot Deals" },
  { icon: Star, label: "Expérience personnalisée selon vos goûts" },
  { icon: Shield, label: "100% gratuit, sans engagement" },
];

const AuthPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || "/";

  // Redirect if already logged in
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue sur GOLDEALS CLUB ! 🎉");
        navigate(from, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Vérifiez votre email pour confirmer votre inscription.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Entrez votre email d'abord.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de réinitialisation envoyé !");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-12 md:gap-16 items-center">
          {/* Benefits panel */}
          <div className="w-full md:w-1/2 md:pr-8">
            <h2 className="font-display text-xl md:text-2xl uppercase tracking-wider mb-2">
              Rejoignez le club
            </h2>
            <p className="text-sm font-body text-foreground/50 mb-8">
              Créez votre compte gratuitement et profitez d'une expérience premium.
            </p>
            <ul className="space-y-4">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </span>
                  <span className="text-sm font-body text-foreground/70 leading-relaxed">{b.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 p-4 border border-foreground/8 bg-muted/30">
              <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-1">
                Déjà membres
              </p>
              <p className="text-2xl font-display tracking-wider text-foreground">
                2 500+ <span className="text-sm font-body text-foreground/40">chasseurs de deals</span>
              </p>
            </div>
          </div>

          {/* Auth form */}
          <div className="w-full md:w-1/2 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-display uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors mb-8">
              <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
              {t.backToHome}
            </Link>

            <h1 className="font-display text-2xl uppercase tracking-wider mb-2">
              {isLogin ? "Connexion" : "Inscription"}
            </h1>
            <p className="text-sm font-body text-foreground/50 mb-8">
              {isLogin ? "Retrouvez vos favoris et alertes" : "Créez votre compte GOLDEALS CLUB"}
            </p>

            {/* Social Sign In */}
            <div className="space-y-3">
              <button
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast.error(error.message);
                }}
                className="w-full flex items-center justify-center gap-3 border border-foreground/15 py-3 text-sm font-body text-foreground/70 hover:border-foreground/30 hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </button>

              <button
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("apple", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast.error(error.message);
                }}
                className="w-full flex items-center justify-center gap-3 border border-foreground/15 py-3 text-sm font-body text-foreground/70 hover:border-foreground/30 hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continuer avec Apple
              </button>
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-foreground/10" />
              <span className="text-[10px] font-display uppercase tracking-widest text-foreground/30">ou</span>
              <div className="flex-1 h-px bg-foreground/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-display uppercase tracking-wider text-foreground/60 mb-1.5 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@email.com"
                  required
                  className="border-foreground/15 bg-transparent font-body text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-display uppercase tracking-wider text-foreground/60 mb-1.5 block">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="border-foreground/15 bg-transparent font-body text-sm"
                />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? "..." : isLogin ? "Se connecter" : "S'inscrire"}
              </Button>
            </form>

            {isLogin && (
              <button
                onClick={handleForgotPassword}
                className="mt-4 text-[10px] font-body text-foreground/40 hover:text-foreground/70 transition-colors block"
              >
                Mot de passe oublié ?
              </button>
            )}

            <div className="mt-8 pt-6 border-t border-foreground/8 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-body text-foreground/50 hover:text-foreground transition-colors"
              >
                {isLogin ? "Pas encore de compte ? Inscrivez-vous" : "Déjà un compte ? Connectez-vous"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
