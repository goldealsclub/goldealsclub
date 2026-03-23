import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Heart, Bell, LogOut, Mail, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const { favorites } = useFavorites();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [alertEnabled, setAlertEnabled] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_alert_preferences")
      .select("enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAlertEnabled(!!data.enabled);
      });
  }, [user]);

  if (loading || !user) return null;

  const createdAt = user.created_at ? format(new Date(user.created_at), "dd MMMM yyyy", { locale: fr }) : "—";
  const provider = user.app_metadata?.provider === "google" ? "Google" : "Email";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
        <h1 className="font-display text-2xl md:text-3xl uppercase tracking-wider mb-8">Mon compte</h1>

        {/* Avatar & email */}
        <div className="flex items-center gap-4 mb-8 p-5 border border-foreground/8 bg-muted/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg uppercase">
            {user.email?.[0] || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-body text-sm text-foreground truncate">{user.email}</p>
            <p className="text-[10px] font-display uppercase tracking-wider text-foreground/40 mt-0.5">
              Connecté via {provider}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 border border-foreground/8 bg-muted/20 text-center">
            <Heart className="w-5 h-5 mx-auto mb-2 text-primary/60" strokeWidth={1.5} />
            <p className="font-display text-xl tracking-wider">{favorites.size}</p>
            <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mt-1">Favoris</p>
          </div>
          <div className="p-4 border border-foreground/8 bg-muted/20 text-center">
            <Bell className="w-5 h-5 mx-auto mb-2 text-primary/60" strokeWidth={1.5} />
            <p className="font-display text-xl tracking-wider">{alertEnabled ? "Actives" : "Inactives"}</p>
            <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mt-1">Alertes</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 border border-foreground/6">
            <Mail className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] font-display uppercase tracking-wider text-foreground/40">Email</p>
              <p className="text-sm font-body text-foreground/70">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-foreground/6">
            <Calendar className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] font-display uppercase tracking-wider text-foreground/40">Membre depuis</p>
              <p className="text-sm font-body text-foreground/70">{createdAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-foreground/6">
            <Shield className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] font-display uppercase tracking-wider text-foreground/40">Connexion</p>
              <p className="text-sm font-body text-foreground/70">{provider}</p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
          Se déconnecter
        </Button>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
