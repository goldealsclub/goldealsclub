import { useState } from "react";
import { Share2, Facebook, MessageCircle, Copy, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/track-event";

interface ShareMenuProps {
  url: string;
  title: string;
  dealId?: string;
}

const ShareMenu = ({ url, title, dealId }: ShareMenuProps) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const shareLinks = [
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: "X", icon: Share2, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}` },
    { name: "Telegram", icon: MessageCircle, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t.copied);
    trackEvent("share_action", { dealId, metadata: { channel: "copy" } });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-2 hover:bg-accent/50 rounded-sm transition-colors"
          aria-label={t.share}
        >
          <Share2 className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-auto min-w-[160px] p-1">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("share_action", { dealId, metadata: { channel: link.name } })}
            className="flex items-center gap-2 px-3 py-2 text-xs font-body text-foreground/70 hover:text-foreground hover:bg-accent/30 rounded-sm transition-colors"
          >
            <link.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {link.name}
          </a>
        ))}
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-2 text-xs font-body text-foreground/70 hover:text-foreground hover:bg-accent/30 rounded-sm transition-colors w-full"
        >
          {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
          {t.copyLink}
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default ShareMenu;
