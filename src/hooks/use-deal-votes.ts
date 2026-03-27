import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useDealVotes(dealId: string) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get total score
    supabase
      .from("deal_votes" as any)
      .select("vote")
      .eq("deal_id", dealId)
      .then(({ data }: any) => {
        if (data) {
          setScore(data.reduce((sum: number, r: any) => sum + r.vote, 0));
        }
      });

    // Get user's vote
    if (user) {
      supabase
        .from("deal_votes" as any)
        .select("vote")
        .eq("deal_id", dealId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) setUserVote(data.vote);
        });
    }
  }, [dealId, user?.id]);

  const vote = async (value: 1 | -1) => {
    if (!user || loading) return;
    setLoading(true);

    if (userVote === value) {
      // Remove vote
      await (supabase.from("deal_votes" as any) as any).delete().eq("deal_id", dealId).eq("user_id", user.id);
      setScore((s) => s - value);
      setUserVote(null);
    } else {
      // Upsert vote
      await (supabase.from("deal_votes" as any) as any).upsert(
        { deal_id: dealId, user_id: user.id, vote: value },
        { onConflict: "deal_id,user_id" }
      );
      setScore((s) => s - (userVote || 0) + value);
      setUserVote(value);
    }
    setLoading(false);
  };

  return { score, userVote, vote, loading };
}