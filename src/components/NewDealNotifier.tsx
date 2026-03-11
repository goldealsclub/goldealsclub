import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Flame } from "lucide-react";

const NewDealNotifier = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const channel = supabase
      .channel("new-deals-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deals",
        },
        (payload) => {
          const deal = payload.new as any;
          if (deal.deal_level === "hot-deal" || deal.is_super_deal) {
            toast({
              title: `🔥 Nouveau ${deal.is_super_deal ? "Super Deal" : "Hot Deal"} !`,
              description: `${deal.brand} — ${deal.title}${deal.discount_percent ? ` (-${deal.discount_percent}%)` : ""}`,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

export default NewDealNotifier;
