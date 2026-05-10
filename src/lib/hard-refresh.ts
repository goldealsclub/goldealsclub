/**
 * Force a true hard refresh: clear caches, unregister service workers,
 * drop in-memory data caches, then reload with a cache-busting query param.
 */
export async function hardRefresh(): Promise<void> {
  try {
    // Drop in-memory deals cache (best effort)
    try {
      const m = await import("@/lib/data");
      m.clearDealsCache?.();
    } catch {
      /* ignore */
    }

    // Clear all CacheStorage entries (PWA / SW caches)
    if (typeof caches !== "undefined" && caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }

    // Unregister all service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }

    // Clear localStorage flags that might gate UI freshness (keep auth/session)
    try {
      sessionStorage.removeItem("deals-cache");
    } catch {
      /* ignore */
    }
  } catch {
    /* swallow — we still want to reload */
  }

  // Cache-busting reload
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
}
