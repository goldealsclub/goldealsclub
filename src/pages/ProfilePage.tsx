import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/favorites";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Heart, Bell, LogOut, Mail, Calendar as CalendarIcon, Shield,
  User, MapPin, Ruler, Tag, Save, Loader2, Instagram, Footprints,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

interface Profile {
  full_name: string;
  date_of_birth: string | null;
  city: string;
  country: string;
  clothing_size: string;
  shoe_size: string;
  preferred_brands: string[];
  bio: string;
  phone: string;
  gender: string;
  instagram_handle: string;
}

const emptyProfile: Profile = {
  full_name: "", date_of_birth: null, city: "", country: "France",
  clothing_size: "", shoe_size: "", preferred_brands: [], bio: "",
  phone: "", gender: "non-précisé", instagram_handle: "",
};

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [brandsInput, setBrandsInput] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const [alertRes, profileRes] = await Promise.all([
      supabase.from("email_alert_preferences").select("enabled").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (alertRes.data) setAlertEnabled(!!alertRes.data.enabled);
    if (profileRes.data) {
      const p = profileRes.data as any;
      setProfile({
        full_name: p.full_name || "",
        date_of_birth: p.date_of_birth || null,
        city: p.city || "",
        country: p.country || "France",
        clothing_size: p.clothing_size || "",
        shoe_size: p.shoe_size || "",
        preferred_brands: p.preferred_brands || [],
        bio: p.bio || "",
        phone: p.phone || "",
        gender: p.gender || "non-précisé",
        instagram_handle: p.instagram_handle || "",
      });
      setBrandsInput((p.preferred_brands || []).join(", "));
    }
    setProfileLoaded(true);
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const brands = brandsInput.split(",").map((b) => b.trim()).filter(Boolean);
      const payload = {
        ...profile,
        preferred_brands: brands,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });

      if (error) throw error;
      toast({ title: "Profil sauvegardé ✓" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  const createdAt = user.created_at ? format(new Date(user.created_at), "dd MMMM yyyy", { locale: fr }) : "—";
  const provider = user.app_metadata?.provider === "google" ? "Google" : user.app_metadata?.provider === "apple" ? "Apple" : "Email";

  const Field = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-foreground/50">
        {icon}{label}
      </label>
      {children}
    </div>
  );

  const inputClass = "w-full bg-muted/30 border border-foreground/10 px-3 py-2.5 text-sm font-body placeholder:text-foreground/25 focus:outline-none focus:border-foreground/30 transition-colors";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-lg">
        <h1 className="font-display text-2xl md:text-3xl uppercase tracking-wider mb-8">Mon compte</h1>

        {/* Avatar & email */}
        <div className="flex items-center gap-4 mb-8 p-5 border border-foreground/8 bg-muted/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg uppercase">
            {user.email?.[0] || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-body text-sm text-foreground truncate">{user.email}</p>
            <p className="text-[10px] font-display uppercase tracking-wider text-foreground/40 mt-0.5">
              Connecté via {provider} · Membre depuis {createdAt}
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

        {/* Profile form */}
        {profileLoaded && (
          <div className="border border-foreground/8 p-5 sm:p-6 mb-8 space-y-5">
            <h2 className="font-display text-sm uppercase tracking-widest text-foreground/70 mb-4">Mon profil</h2>

            <Field label="Nom complet" icon={<User className="w-3 h-3" />}>
              <input className={inputClass} value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Jean Dupont" />
            </Field>

            <Field label="Date de naissance" icon={<CalendarIcon className="w-3 h-3" />}>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(inputClass, "text-left", !profile.date_of_birth && "text-foreground/25")}>
                    {profile.date_of_birth ? format(new Date(profile.date_of_birth), "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={profile.date_of_birth ? new Date(profile.date_of_birth) : undefined}
                    onSelect={(d) => setProfile({ ...profile, date_of_birth: d ? d.toISOString().slice(0, 10) : null })}
                    disabled={(d) => d > new Date() || d < new Date("1920-01-01")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </Field>

            <Field label="Genre" icon={<User className="w-3 h-3" />}>
              <select className={inputClass} value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                <option value="non-précisé">Non précisé</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="autre">Autre</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville" icon={<MapPin className="w-3 h-3" />}>
                <input className={inputClass} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Paris" />
              </Field>
              <Field label="Pays" icon={<MapPin className="w-3 h-3" />}>
                <input className={inputClass} value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="France" />
              </Field>
            </div>

            <Field label="Téléphone" icon={<Mail className="w-3 h-3" />}>
              <input className={inputClass} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+33 6 12 34 56 78" />
            </Field>

            <Field label="Instagram" icon={<Instagram className="w-3 h-3" />}>
              <input className={inputClass} value={profile.instagram_handle} onChange={(e) => setProfile({ ...profile, instagram_handle: e.target.value })} placeholder="@monpseudo" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Taille vêtements" icon={<Ruler className="w-3 h-3" />}>
                <select className={inputClass} value={profile.clothing_size} onChange={(e) => setProfile({ ...profile, clothing_size: e.target.value })}>
                  <option value="">—</option>
                  {CLOTHING_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Pointure" icon={<Footprints className="w-3 h-3" />}>
                <select className={inputClass} value={profile.shoe_size} onChange={(e) => setProfile({ ...profile, shoe_size: e.target.value })}>
                  <option value="">—</option>
                  {SHOE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Marques préférées" icon={<Tag className="w-3 h-3" />}>
              <input className={inputClass} value={brandsInput} onChange={(e) => setBrandsInput(e.target.value)} placeholder="Nike, Adidas, New Balance..." />
              <p className="text-[9px] text-foreground/30 mt-1">Séparer les marques par des virgules</p>
            </Field>

            <Field label="Bio" icon={<User className="w-3 h-3" />}>
              <textarea className={cn(inputClass, "resize-none h-20")} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Quelques mots sur toi..." />
            </Field>

            <Button onClick={saveProfile} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={async () => { await signOut(); navigate("/"); }}
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
