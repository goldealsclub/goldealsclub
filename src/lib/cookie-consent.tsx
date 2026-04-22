/**
 * Cookie consent store + React hook.
 *
 * Two categories:
 *  - "necessary" — always on (auth, preferences). Not gated.
 *  - "analytics" — outbound click tracking + Awin attribution. Opt-in only.
 *
 * Persisted in localStorage. Components subscribe via `useCookieConsent()`.
 * Non-React code reads via `hasAnalyticsConsent()`.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

const STORAGE_KEY = "goldealsclub.cookie-consent.v1";

export type ConsentStatus = "unset" | "accepted" | "rejected";

export interface ConsentState {
  analytics: ConsentStatus;
  /** ISO timestamp of last decision */
  decidedAt: string | null;
}

const DEFAULT_STATE: ConsentState = { analytics: "unset", decidedAt: null };

const EVENT = "goldealsclub:consent-changed";

function read(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      analytics: parsed.analytics === "accepted" || parsed.analytics === "rejected" ? parsed.analytics : "unset",
      decidedAt: parsed.decidedAt ?? null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function write(next: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  } catch {
    /* ignore */
  }
}

/** Synchronous read for non-React code (e.g. trackOutboundClick). */
export function hasAnalyticsConsent(): boolean {
  return read().analytics === "accepted";
}

/** Programmatically set consent (used by banner + settings link). */
export function setAnalyticsConsent(value: "accepted" | "rejected") {
  write({ analytics: value, decidedAt: new Date().toISOString() });
}

/** Reset to "unset" — re-shows the banner. */
export function resetConsent() {
  write({ analytics: "unset", decidedAt: null });
}

/* ─── React layer ─── */

interface ConsentContextValue {
  state: ConsentState;
  accept: () => void;
  reject: () => void;
  reset: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>(() => read());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail;
      if (detail) setState(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(read());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const accept = useCallback(() => setAnalyticsConsent("accepted"), []);
  const reject = useCallback(() => setAnalyticsConsent("rejected"), []);
  const reset = useCallback(() => resetConsent(), []);

  return (
    <ConsentContext.Provider value={{ state, accept, reject, reset }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within ConsentProvider");
  return ctx;
}
