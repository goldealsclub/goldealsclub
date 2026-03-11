import { deals } from "@/lib/data";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useI18n } from "@/lib/i18n";
import DealCard from "@/components/DealCard";
import { Clock } from "lucide-react";

interface Props {
  excludeId?: string;
  limit?: number;
}

const RecentlyViewed = ({ excludeId, limit = 4 }: Props) => {
  const { viewedIds } = useRecentlyViewed();
  const { t } = useI18n();

  const recentDeals = viewedIds
    .filter((id) => id !== excludeId)
    .map((id) => deals.find((d) => d.id === id))
    .filter(Boolean)
    .slice(0, limit);

  if (recentDeals.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center gap-2 mb-8">
        <Clock className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
        <h2 className="font-display text-xl tracking-wider">{t.recentlyViewed}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/8">
        {recentDeals.map((deal) => (
          <DealCard key={deal!.id} deal={deal!} />
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewed;
