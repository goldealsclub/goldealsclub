import { useI18n } from "@/lib/i18n";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Share, Plus, MoreVertical, Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

const InstallPage = () => {
  const { t } = useI18n();
  const { canInstall, isStandalone, install } = useInstallPrompt();

  if (isStandalone) {
    return (
      <>
        <SEOHead title={t.installPageTitle} description={t.installPageDesc} />
        <Header />
        <main className="min-h-screen pt-32 pb-20 px-4 max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-display font-bold mb-2">{t.installAlreadyInstalled}</h1>
          <p className="text-sm text-muted-foreground">{t.installAlreadyInstalledSub}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEOHead title={t.installPageTitle} description={t.installPageDesc} />
      <Header />
      <main className="min-h-screen pt-32 pb-20 px-4 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📲</div>
          <h1 className="text-xl font-display font-bold tracking-tight mb-2">
            {t.installPageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{t.installPageDesc}</p>
        </div>

        {/* Native install (Android/Chrome) */}
        {canInstall && (
          <div className="mb-8">
            <button
              onClick={() => install()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-sm py-3 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {t.installButton}
            </button>
          </div>
        )}

        {/* iOS Tutorial */}
        <section className="mb-10">
          <h2 className="text-sm font-display font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">🍎</span>
            iPhone / iPad (Safari)
          </h2>
          <div className="space-y-4">
            <Step number={1} icon={<Share className="w-5 h-5" />} title={t.installStep1Title} desc={t.installStep1Desc} />
            <Step number={2} icon={<Plus className="w-5 h-5" />} title={t.installStep2Title} desc={t.installStep2Desc} />
            <Step number={3} icon={<Download className="w-5 h-5" />} title={t.installStep3Title} desc={t.installStep3Desc} />
          </div>
        </section>

        {/* Android Tutorial */}
        <section>
          <h2 className="text-sm font-display font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">🤖</span>
            Android (Chrome)
          </h2>
          <div className="space-y-4">
            <Step number={1} icon={<MoreVertical className="w-5 h-5" />} title={t.installAndroidStep1Title} desc={t.installAndroidStep1Desc} />
            <Step number={2} icon={<Download className="w-5 h-5" />} title={t.installAndroidStep2Title} desc={t.installAndroidStep2Desc} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

const Step = ({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
      {number}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default InstallPage;
