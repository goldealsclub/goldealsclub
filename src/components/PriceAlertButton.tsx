import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  dealId: string;
  dealTitle: string;
}

const PriceAlertButton = ({ dealId, dealTitle }: Props) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleClick = async () => {
    if (!user) {
      toast({
        title: t.priceAlertLoginRequired,
        description: t.priceAlertLoginDesc,
      });
      return;
    }

    setLoading(true);
    // Store alert preference — for now use a simple localStorage + toast approach
    // In production this would go to a price_alerts table
    const key = `goldeals_price_alert_${dealId}`;
    const existing = localStorage.getItem(key);

    if (existing) {
      localStorage.removeItem(key);
      setSubscribed(false);
      toast({ title: t.priceAlertRemoved });
    } else {
      localStorage.setItem(key, JSON.stringify({ dealId, userId: user.id, createdAt: new Date().toISOString() }));
      setSubscribed(true);
      toast({
        title: t.priceAlertSet,
        description: t.priceAlertSetDesc,
      });
    }
    setLoading(false);
  };

  // Check on mount
  useState(() => {
    const key = `goldeals_price_alert_${dealId}`;
    if (localStorage.getItem(key)) setSubscribed(true);
  });

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 text-xs font-body transition-colors ${
        subscribed
          ? "text-foreground"
          : "text-foreground/50 hover:text-foreground"
      }`}
    >
      {subscribed ? (
        <BellRing className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Bell className="w-4 h-4" strokeWidth={1.5} />
      )}
      {subscribed ? t.priceAlertActive : t.priceAlert}
    </button>
  );
};

export default PriceAlertButton;
