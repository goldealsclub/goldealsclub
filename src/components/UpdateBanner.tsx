import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CHECK_INTERVAL = 60_000; // check every 60s
const BUILD_META_URL = "/build-meta.json";

const UpdateBanner = () => {
  const { t } = useI18n();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(BUILD_META_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const newVersion = data.version;

      if (!currentVersion) {
        setCurrentVersion(newVersion);
        return;
      }

      if (newVersion && newVersion !== currentVersion) {
        setUpdateAvailable(true);
      }
    } catch {
      // silently fail
    }
  }, [currentVersion]);

  useEffect(() => {
    // Initial check
    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  const handleUpdate = () => {
    // Drop the cached deals so the new build fetches fresh data on reload.
    import("@/lib/data").then((m) => m.clearDealsCache?.()).catch(() => {});
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] animate-fade-in">
      <div className="mx-3 mb-3 bg-primary text-primary-foreground rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-semibold tracking-wide">
            {t.updateAvailable}
          </p>
          <p className="text-[10px] opacity-70 leading-tight mt-0.5">
            {t.updateAvailableSub}
          </p>
        </div>
        <button
          onClick={handleUpdate}
          className="shrink-0 text-[10px] font-display uppercase tracking-wider bg-primary-foreground text-primary px-3 py-1.5 rounded-lg"
        >
          {t.updateNow}
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 p-1 opacity-40 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
