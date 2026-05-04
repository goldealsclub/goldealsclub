import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

const SESSION_KEY = "goldeals_session_id";
const LAST_PATH_KEY = "goldeals_last_tracked_path";
const LAST_TIME_KEY = "goldeals_last_tracked_time";
const DEDUP_MS = 1500;

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
 * Record a page view via edge function so geo (country) + auth user_id
 * are resolved server-side. Fire-and-forget, dedups same-path within 1.5s.
 */
export function trackPageView(path: string) {
  if (!hasAnalyticsConsent()) return;

  try {
    const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
    const lastTime = Number(sessionStorage.getItem(LAST_TIME_KEY) || 0);
    const now = Date.now();
    if (lastPath === path && now - lastTime < DEDUP_MS) return;
    sessionStorage.setItem(LAST_PATH_KEY, path);
    sessionStorage.setItem(LAST_TIME_KEY, String(now));
  } catch {
    // ignore
  }

  supabase.functions
    .invoke("track-pageview", {
      body: {
        path,
        referrer: document.referrer || null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent.slice(0, 300),
      },
    })
    .then(({ error }) => {
      if (error) console.warn("Pageview tracking failed:", error.message);
    });
}
