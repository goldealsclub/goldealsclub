/**
 * Premium skeleton mirroring the DealFilters bar:
 *  - Level chip tabs (Hot / Bon / Promo / Tous)
 *  - Sort row + Filters button
 *  - Optional results count line
 */
interface Props {
  /** Show a small "X résultats" placeholder above the chips */
  showCount?: boolean;
  /** Number of level chips (default 4) */
  chipCount?: number;
  /** Number of sort options shown (default 5) */
  sortCount?: number;
  /** Render on dark surface (inverted tones) */
  dark?: boolean;
}

const DealFiltersSkeleton = ({
  showCount = false,
  chipCount = 4,
  sortCount = 5,
  dark = false,
}: Props) => {
  const block = dark ? "bg-background/10" : "bg-foreground/8";
  const blockSoft = dark ? "bg-background/[0.06]" : "bg-foreground/[0.05]";
  const border = dark ? "border-background/10" : "border-foreground/8";
  const shimmer = dark
    ? "via-background/[0.08]"
    : "via-foreground/[0.06]";

  return (
    <div className="relative overflow-hidden" aria-hidden="true">
      {/* Optional results count */}
      {showCount && (
        <div className={`h-2.5 w-24 rounded-sm mb-6 ${blockSoft}`} />
      )}

      {/* Level chip tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-hidden pb-2">
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={i}
            className={`h-8 rounded-sm border ${border} ${blockSoft}`}
            style={{ width: `${72 + (i % 3) * 18}px` }}
          />
        ))}
      </div>

      {/* Sort row + filters button */}
      <div className={`flex items-center justify-between border-b ${border} pb-4 mb-6`}>
        <div className="flex items-center gap-3 overflow-x-hidden">
          <div className={`h-2.5 w-12 rounded-sm ${blockSoft}`} />
          {Array.from({ length: sortCount }).map((_, i) => (
            <div
              key={i}
              className={`h-7 rounded-sm ${blockSoft}`}
              style={{ width: `${56 + (i % 3) * 14}px` }}
            />
          ))}
        </div>
        <div className={`h-8 w-24 rounded-sm border ${border} ${block} ml-4 shrink-0`} />
      </div>

      {/* Shimmer overlay */}
      <div
        className={`pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent ${shimmer} to-transparent`}
      />
    </div>
  );
};

export default DealFiltersSkeleton;
