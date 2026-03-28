import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const InstallBanner = () => {
  const { canInstall, isIos, isMobile, isStandalone, install } = useInstallPrompt();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      await install();
    }
  };

  // Only show banner when native install prompt is available
  if (isStandalone || dismissed || !canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-fade-in">
      <div className="mx-3 mb-3 bg-foreground text-background rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-background/10 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-semibold tracking-wide">GOLDEALS CLUB</p>
          <p className="text-[10px] opacity-60 leading-tight mt-0.5">
            {isIos ? t.installIosHint : canInstall ? t.installAppSub : t.installAndroidHint}
          </p>
        </div>
        <button
          onClick={handleInstallClick}
          className="shrink-0 text-[10px] font-display uppercase tracking-wider bg-background text-foreground px-3 py-1.5 rounded-lg"
        >
          {t.installButton}
        </button>
        <button onClick={handleDismiss} className="shrink-0 p-1 opacity-40 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
