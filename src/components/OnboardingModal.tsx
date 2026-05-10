import { useState, useEffect } from "react";
import { deals as allDeals, Category } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { X, Sparkles, ArrowRight } from "lucide-react";

const STORAGE_KEY = "goldeals_onboarding_done";
const PREFS_KEY = "goldeals_user_prefs";
const EXCLUDED_ONBOARDING_BRANDS = new Set(["Snipes"]);

export interface UserPrefs {
  brands: string[];
  categories: Category[];
}

export function getUserPrefs(): UserPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const OnboardingModal = () => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"brands" | "categories">("brands");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const isAdminRoute = window.location.pathname.startsWith("/admin");

  const allBrands = [...new Set(allDeals.map((d) => d.brand).filter((brand) => brand && !EXCLUDED_ONBOARDING_BRANDS.has(brand)))].sort();
  const allCategories = [...new Set(allDeals.map((d) => d.category))].sort() as Category[];

  const categoryLabels: Record<string, string> = {
    sneakers: t.sneakers, jackets: t.jackets, hoodies: t.hoodies,
    tshirts: t.tshirts, "t-shirts": "T-shirts", pants: t.pants,
    pantalons: "Pantalons", accessories: t.accessories, accessoires: t.accessories,
    vestes: t.jackets, autres: "Autres",
  };

  useEffect(() => {
    if (isAdminRoute) {
      setVisible(false);
      return;
    }

    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAdminRoute]);

  const finish = () => {
    const prefs: UserPrefs = { brands: selectedBrands, categories: selectedCategories };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const toggleBrand = (b: string) =>
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const toggleCategory = (c: Category) =>
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  if (!visible || isAdminRoute) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-foreground/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-background w-full max-w-lg mx-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-foreground/8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-foreground/50" strokeWidth={1.5} />
            <h2 className="font-display text-sm tracking-wider uppercase">{t.onboardingTitle}</h2>
          </div>
          <button onClick={skip} className="p-1.5 hover:bg-accent/50 transition-colors">
            <X className="w-4 h-4 text-foreground/40" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6">
          <p className="font-body text-xs text-foreground/50 mb-6">{t.onboardingSub}</p>

          {step === "brands" && (
            <>
              <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-3">{t.onboardingBrands}</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {allBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                      selectedBrands.includes(b)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("categories")}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[10px] font-display uppercase tracking-widest hover:bg-foreground/80 transition-colors"
              >
                {t.onboardingNext}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </>
          )}

          {step === "categories" && (
            <>
              <p className="text-[10px] font-display uppercase tracking-widest text-foreground/40 mb-3">{t.onboardingCategories}</p>
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`text-[10px] font-display uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                      selectedCategories.includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-foreground/10 text-foreground/50 hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {categoryLabels[c] || c}
                  </button>
                ))}
              </div>
              <button
                onClick={finish}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[10px] font-display uppercase tracking-widest hover:bg-foreground/80 transition-colors"
              >
                {t.onboardingFinish}
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </>
          )}

          <button
            onClick={skip}
            className="mt-3 w-full text-center text-[10px] font-body text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            {t.onboardingSkip}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
