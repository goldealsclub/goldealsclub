import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const AuthPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie !");
        navigate("/");
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
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-display uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
            {t.backToHome}
          </Link>

          <h1 className="font-display text-2xl uppercase tracking-wider mb-2">
            {isLogin ? "Connexion" : "Inscription"}
          </h1>
          <p className="text-sm font-body text-foreground/50 mb-8">
            {isLogin ? "Connectez-vous à votre compte" : "Créez votre compte GOLDEALS CLUB"}
          </p>

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
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
