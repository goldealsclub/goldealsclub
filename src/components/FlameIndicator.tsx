import { Flame } from "lucide-react";

interface FlameIndicatorProps {
  count: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const FlameIndicator = ({ count, className = "", size = "md" }: FlameIndicatorProps) => {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const isHot = count >= 3;
  const isGood = count === 2;

  return (
    <span
      className={`inline-flex items-center gap-0 ${className}`}
      title={`${count}/3`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Flame
          key={i}
          className={`${sizeClasses[size]} animate-[flicker_1.5s_ease-in-out_infinite] drop-shadow-[0_0_6px_rgba(255,160,0,0.7)] ${
            isHot
              ? "text-red-500 fill-yellow-400/80"
              : isGood
              ? "text-orange-500 fill-yellow-300/70"
              : "text-amber-500 fill-yellow-200/60"
          }`}
          strokeWidth={1.5}
          style={{ animationDelay: `${i * 0.25}s`, marginLeft: i > 0 ? "-4px" : "0" }}
        />
      ))}
    </span>
  );
};

export default FlameIndicator;
