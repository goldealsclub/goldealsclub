import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

const SESSION_KEY = "goldeals_session_id";

export type EventType =
  | "deal_view"
  | "favorite_add"
  | "favorite_remove"
  | "share_open"
  | "share_action"
  | "merchant_redirect"
  | "promo_code_copy"
  | "compare_add"
  | "search_query";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

/**
 * Fire-and-forget event tracking. Respects cookie consent.
 */
export function trackEvent(
  eventType: EventType,
  options: { dealId?: string; metadata?: Record<string, unknown> } = {}
) {
  if (!hasAnalyticsConsent()) return;

  supabase
    .from("events" as any)
    .insert({
      event_type: eventType,
      deal_id: options.dealId ?? null,
      metadata: options.metadata ?? {},
      session_id: getSessionId(),
      path: typeof window !== "undefined" ? window.location.pathname : null,
    })
    .then(({ error }) => {
      if (error) console.warn(`Event tracking failed (${eventType}):`, error.message);
    });
}
