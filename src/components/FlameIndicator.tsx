import { Flame } from "lucide-react";
import { DealTier } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

interface FlameIndicatorProps {
  tier: DealTier;
  className?: string;
}

const FlameIndicator = ({ tier, className = "" }: FlameIndicatorProps) => {
  const { t } = useI18n();

  if (tier === "gold") {
    return (
      <span className={`inline-flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-display uppercase tracking-widest ${className}`}>
        {t.goldSelection}
      </span>
    );
  }

  const count = tier === "super" ? 2 : 1;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Flame key={i} className="w-3.5 h-3.5 text-foreground" strokeWidth={1.5} />
      ))}
    </span>
  );
};

export default FlameIndicator;
