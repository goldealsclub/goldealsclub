import { useState } from "react";
import { Copy, Check, Tag } from "lucide-react";
import type { PromoCode } from "@/lib/promo-codes";
import { trackEvent } from "@/lib/track-event";

interface PromoCodeBadgeProps {
  code: PromoCode;
  variant?: "compact" | "full";
}

const PromoCodeBadge = ({ code, variant = "compact" }: PromoCodeBadgeProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code.code).then(() => {
      setCopied(true);
      trackEvent("promo_code_copy", { metadata: { code: code.code } });
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleCopy}
        title={`${code.description} — Cliquer pour copier`}
        className="inline-flex items-center gap-1.5 border border-foreground/20 bg-background/95 px-2 py-0.5 text-[10px] font-display uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors"
      >
        <Tag className="w-3 h-3" strokeWidth={1.5} />
        <span>{code.code}</span>
        {copied ? <Check className="w-3 h-3" strokeWidth={2} /> : <Copy className="w-3 h-3" strokeWidth={1.5} />}
      </button>
    );
  }

  return (
    <div className="border border-foreground/15 bg-foreground/[0.02] p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
          <span className="text-[10px] font-display uppercase tracking-widest text-foreground/50">
            Code promo · {code.discountLabel}
          </span>
        </div>
        <p className="font-body text-sm text-foreground/80">{code.description}</p>
        {code.conditions && (
          <p className="font-body text-[11px] text-foreground/40 mt-1">{code.conditions}</p>
        )}
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 inline-flex items-center gap-2 border border-dashed border-foreground/40 bg-background px-4 py-2 font-display tracking-widest text-sm hover:bg-foreground hover:text-background transition-colors"
      >
        <span>{code.code}</span>
        {copied ? <Check className="w-4 h-4" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
      </button>
    </div>
  );
};

export default PromoCodeBadge;
