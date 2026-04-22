import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

/**
 * Generate a unique click reference for Awin conversion tracking.
 * Format: dealId__timestamp to correlate conversions in Awin dashboard.
 */
function generateClickRef(dealId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${dealId}__${ts}_${rand}`;
}

/**
 * Append clickref parameter to Awin affiliate URLs for conversion tracking.
 * This allows correlating Awin conversions back to specific deals and clicks.
 */
export function buildAwinUrl(url: string, dealId: string): string {
  if (!url) return url;

  const clickRef = generateClickRef(dealId);

  try {
    const u = new URL(url);
    // Awin URLs support clickref parameter
    if (u.hostname.includes("awin1.com") || u.hostname.includes("awin.com")) {
      u.searchParams.set("clickref", clickRef);
      return u.toString();
    }
  } catch {
    // If URL parsing fails, try simple append
    if (url.includes("awin1.com") || url.includes("awin.com")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}clickref=${encodeURIComponent(clickRef)}`;
    }
  }

  return url;
}

export function trackOutboundClick(dealId: string, destinationUrl: string) {
  // Respect cookie consent: skip recording if analytics opt-in not granted.
  if (!hasAnalyticsConsent()) return;

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
