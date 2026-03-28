import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useI18n } from "@/lib/i18n";

const InstallBanner = () => {
  const { canInstall, isIos, isMobile, isStandalone, install } = useInstallPrompt();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  // Delay popup appearance for better UX
  useEffect(() => {
    if (dismissed || isStandalone || !isMobile) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [dismissed, isStandalone, isMobile]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (isStandalone || dismissed || !isMobile || !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
        onClick={handleDismiss}
      />
      {/* Popup */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
        <div className="mx-0 bg-background rounded-t-2xl shadow-2xl border-t border-border px-5 pt-6 pb-8">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight">
              {t.installApp}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
              {t.installAppSub}
            </p>
          </div>

          {canInstall ? (
            <button
              onClick={async () => {
                await install();
                handleDismiss();
              }}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-sm py-3.5 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {t.installButton}
            </button>
          ) : (
            <Link
              to="/install"
              onClick={handleDismiss}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-sm py-3.5 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {t.installButton}
            </Link>
          )}

          <button
            onClick={handleDismiss}
            className="w-full text-xs text-muted-foreground mt-3 py-2"
          >
            {t.notNow || "Pas maintenant"}
          </button>
        </div>
      </div>
    </>
  );
};

export default InstallBanner;
