import { supabase } from "@/integrations/supabase/client";

export function trackOutboundClick(dealId: string, destinationUrl: string) {
  // Fire-and-forget: don't block navigation
  supabase
    .from("outbound_clicks" as any)
    .insert({
      deal_id: dealId,
      destination_url: destinationUrl,
      referrer: window.location.pathname,
    })
    .then(({ error }) => {
      if (error) console.warn("Click tracking failed:", error.message);
    });
}
