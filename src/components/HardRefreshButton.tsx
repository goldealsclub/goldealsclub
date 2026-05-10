import { useState } from "react";
import { RotateCw } from "lucide-react";
import { hardRefresh } from "@/lib/hard-refresh";

/**
 * Discreet always-visible button to force a true hard refresh
 * (clears caches, unregisters service workers, cache-busts the URL).
 * Sits bottom-left so it doesn't conflict with BackToTop / banners.
 */
const HardRefreshButton = () => {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    await hardRefresh();
  };

  return (
    <button
      onClick={onClick}
      aria-label="Forcer le rechargement"
      title="Forcer le rechargement (vider le cache)"
      className="fixed bottom-3 left-3 z-[55] w-9 h-9 rounded-full bg-foreground/80 text-background backdrop-blur-sm shadow-lg flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
    >
      <RotateCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
};

export default HardRefreshButton;
