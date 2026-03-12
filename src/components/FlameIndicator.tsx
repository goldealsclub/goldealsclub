import { Flame } from "lucide-react";

interface FlameIndicatorProps {
  count: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SPARKLE_COUNT = 5;

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
      className={`relative inline-flex items-center gap-0 ${className}`}
      title={`${count}/3`}
    >
      {/* Sparkles for hot-deals only */}
      {isHot && (
        <span className="absolute inset-0 pointer-events-none" aria-hidden>
          {Array.from({ length: SPARKLE_COUNT }).map((_, i) => {
            const angle = (i / SPARKLE_COUNT) * 360;
            const radius = 14 + (i % 2) * 6;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <span
                key={i}
                className="absolute w-1 h-1 rounded-full animate-[sparkle_2s_ease-in-out_infinite]"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  animationDelay: `${i * 0.4}s`,
                  background: i % 2 === 0
                    ? "radial-gradient(circle, rgba(255,220,50,1) 0%, rgba(255,160,0,0) 70%)"
                    : "radial-gradient(circle, rgba(255,120,30,1) 0%, rgba(255,80,0,0) 70%)",
                }}
              />
            );
          })}
        </span>
      )}

      {Array.from({ length: count }).map((_, i) => (
        <Flame
          key={i}
          className={`${sizeClasses[size]} animate-[flicker_1.5s_ease-in-out_infinite] ${
            isHot
              ? "text-red-500 fill-yellow-400/90 drop-shadow-[0_0_8px_rgba(255,100,0,0.8)]"
              : isGood
              ? "text-orange-500 fill-yellow-300/80 drop-shadow-[0_0_6px_rgba(255,160,0,0.6)]"
              : "text-amber-500 fill-yellow-200/70 drop-shadow-[0_0_4px_rgba(255,200,0,0.5)]"
          }`}
          strokeWidth={1.5}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${1.2 + i * 0.3}s`,
            marginLeft: i > 0 ? "-4px" : "0",
          }}
        />
      ))}
    </span>
  );
};

export default FlameIndicator;
