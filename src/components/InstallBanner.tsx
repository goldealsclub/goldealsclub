import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDismissed(true);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (isStandalone || dismissed) return null;

  // Show only on mobile when install prompt is available OR on iOS
  const showBanner = deferredPrompt || isIos;
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-fade-in">
      <div className="mx-3 mb-3 bg-foreground text-background rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-background/10 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-semibold tracking-wide">GOLDEALS CLUB</p>
          {isIos && !deferredPrompt ? (
            <p className="text-[10px] opacity-60 leading-tight mt-0.5">
              Appuie sur Partager puis "Sur l'écran d'accueil"
            </p>
          ) : (
            <p className="text-[10px] opacity-60 leading-tight mt-0.5">
              Installe l'app pour un accès rapide
            </p>
          )}
        </div>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="shrink-0 text-[10px] font-display uppercase tracking-wider bg-background text-foreground px-3 py-1.5 rounded-lg"
          >
            Installer
          </button>
        )}
        <button onClick={handleDismiss} className="shrink-0 p-1 opacity-40 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
