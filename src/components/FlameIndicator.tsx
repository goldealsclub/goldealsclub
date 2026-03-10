import { Flame } from "lucide-react";
import { DealTier } from "@/lib/data";

interface FlameIndicatorProps {
  tier: DealTier;
  className?: string;
}

const FlameIndicator = ({ tier, className = "" }: FlameIndicatorProps) => {
  const count = tier === "exceptional" ? 3 : tier === "super" ? 2 : 1;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`${count}/3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Flame
          key={i}
          className={`w-3.5 h-3.5 transition-colors ${
            tier === "exceptional"
              ? "text-amber-700 fill-amber-700/30"
              : tier === "super"
              ? "text-foreground fill-foreground/20"
              : "text-foreground/50"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
};

export default FlameIndicator;
