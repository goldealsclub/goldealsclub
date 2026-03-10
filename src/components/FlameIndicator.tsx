import { Flame } from "lucide-react";

interface FlameIndicatorProps {
  count: number;
  className?: string;
}

const FlameIndicator = ({ count, className = "" }: FlameIndicatorProps) => {
  if (count <= 0) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`${count}/3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Flame
          key={i}
          className={`w-3.5 h-3.5 transition-colors ${
            count >= 3
              ? "text-amber-700 fill-amber-700/30"
              : count === 2
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
