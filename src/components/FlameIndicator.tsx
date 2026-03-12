import { Flame } from "lucide-react";

interface FlameIndicatorProps {
  count: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const FlameIndicator = ({ count, className = "", size = "md" }: FlameIndicatorProps) => {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const containerPadding = {
    sm: "px-1 py-0.5",
    md: "px-1.5 py-1",
    lg: "px-2 py-1.5",
  };

  const isHot = count >= 3;
  const isGood = count === 2;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-sm backdrop-blur-sm ${
        isHot
          ? "bg-orange-500/15 border border-orange-500/30"
          : isGood
          ? "bg-amber-500/10 border border-amber-500/20"
          : "bg-foreground/5 border border-foreground/10"
      } ${containerPadding[size]} ${className}`}
      title={`${count}/3`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Flame
          key={i}
          className={`${sizeClasses[size]} drop-shadow-sm animate-[flicker_1.5s_ease-in-out_infinite] ${
            isHot
              ? "text-orange-500 fill-orange-500/50"
              : isGood
              ? "text-amber-500 fill-amber-500/40"
              : "text-foreground/50 fill-foreground/10"
          }`}
          strokeWidth={1.8}
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </span>
  );
};

export default FlameIndicator;
