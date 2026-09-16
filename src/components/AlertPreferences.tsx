import { useState, useEffect, forwardRef } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const AlertPreferences = forwardRef<HTMLButtonElement>((_props, ref) => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("email_alert_preferences" as any)
        .select("enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) setEnabled((data as any).enabled);
      setLoading(false);
    };
    load();
  }, [user]);

  const toggle = async () => {
    if (!user) return;
    setSaving(true);
    const newValue = !enabled;

    const { error } = await supabase
      .from("email_alert_preferences" as any)
      .upsert(
        { user_id: user.id, enabled: newValue, updated_at: new Date().toISOString() } as any,
        { onConflict: "user_id" }
      );

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      setEnabled(newValue);
      toast.success(
        newValue
          ? "Alertes activées ! Vous recevrez un résumé quotidien."
          : "Alertes désactivées."
      );
    }
    setSaving(false);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-foreground/40">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <button
      ref={ref}
      onClick={toggle}
      disabled={saving}
      className={`flex items-center gap-1.5 p-1.5 md:px-3 md:py-1.5 text-[10px] font-display uppercase tracking-[0.15em] border transition-all ${
        enabled
          ? "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
          : "border-foreground/15 text-foreground/50 hover:text-foreground hover:border-foreground/30"
      }`}
      title={enabled ? "Désactiver les alertes quotidiennes" : "Activer les alertes quotidiennes"}
    >
      {saving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : enabled ? (
        <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
      ) : (
        <BellOff className="w-3.5 h-3.5" strokeWidth={1.5} />
      )}
      <span className="hidden md:inline">{enabled ? "Alertes ON" : "Alertes OFF"}</span>
    </button>
  );
});

AlertPreferences.displayName = "AlertPreferences";

export default AlertPreferences;
