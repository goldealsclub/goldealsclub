const DealCardSkeleton = () => (
  <div className="border border-foreground/8 bg-background animate-pulse">
    <div className="aspect-square bg-foreground/5" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-foreground/8 rounded w-1/3" />
      <div className="h-4 bg-foreground/8 rounded w-3/4" />
      <div className="h-4 bg-foreground/8 rounded w-1/2" />
      <div className="h-5 bg-foreground/8 rounded w-1/4" />
      <div className="h-px bg-foreground/8 mt-3" />
      <div className="flex justify-between">
        <div className="h-4 bg-foreground/8 rounded w-20" />
        <div className="h-4 bg-foreground/8 rounded w-16" />
      </div>
    </div>
  </div>
);

export default DealCardSkeleton;