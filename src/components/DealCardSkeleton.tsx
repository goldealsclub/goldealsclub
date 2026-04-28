const DealCardSkeleton = () => (
  <div className="relative overflow-hidden border border-foreground/8 bg-background">
    {/* Image area */}
    <div className="relative aspect-square overflow-hidden bg-foreground/[0.04]">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
    </div>
    {/* Body */}
    <div className="relative p-4 space-y-3 overflow-hidden">
      <div className="h-2.5 bg-foreground/[0.06] rounded-sm w-1/3" />
      <div className="h-3.5 bg-foreground/[0.08] rounded-sm w-4/5" />
      <div className="h-3.5 bg-foreground/[0.08] rounded-sm w-2/3" />
      <div className="h-px bg-foreground/8 my-3" />
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-2 bg-foreground/[0.06] rounded-sm w-10" />
          <div className="h-5 bg-foreground/[0.1] rounded-sm w-20" />
        </div>
        <div className="h-3 bg-foreground/[0.06] rounded-sm w-12" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.05] to-transparent" />
    </div>
  </div>
);

export default DealCardSkeleton;
