import { useState } from "react";
import { Share2, Facebook, MessageCircle, Copy, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface ShareMenuProps {
  url: string;
  title: string;
}

const ShareMenu = ({ url, title }: ShareMenuProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-accent/50 rounded-sm transition-colors"
        aria-label={t.share}
      >
        <Share2 className="w-4 h-4 text-foreground/60 hover:text-foreground transition-colors" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-foreground/10 p-2 min-w-[160px] animate-fade-in">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-body text-foreground/70 hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              <link.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {link.name}
            </a>
          ))}
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-2 text-xs font-body text-foreground/70 hover:text-foreground hover:bg-accent/30 transition-colors w-full"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
            {t.copyLink}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareMenu;
