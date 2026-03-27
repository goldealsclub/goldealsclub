import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import React from "react";

interface VoteData {
  score: number;
  userVote: number | null;
}

interface VotesContextType {
  votes: Record<string, VoteData>;
  loadVotes: (dealIds: string[]) => void;
  vote: (dealId: string, value: 1 | -1) => Promise<void>;
}

const VotesContext = createContext<VotesContextType | null>(null);

export function VotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteData>>({});
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const loadVotes = useCallback((dealIds: string[]) => {
    const newIds = dealIds.filter((id) => !loadedIds.has(id));
    if (newIds.length === 0) return;

    // Mark as loading to prevent duplicate requests
    setLoadedIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });

    // Batch fetch all votes for these deals
    supabase
      .from("deal_votes" as any)
      .select("deal_id, vote, user_id")
      .in("deal_id", newIds)
      .then(({ data }: any) => {
        if (!data) return;
        const scoreMap: Record<string, { score: number; userVote: number | null }> = {};

        // Initialize all requested ids
        newIds.forEach((id) => {
          scoreMap[id] = { score: 0, userVote: null };
        });

        // Aggregate
        data.forEach((row: any) => {
          if (!scoreMap[row.deal_id]) {
            scoreMap[row.deal_id] = { score: 0, userVote: null };
          }
          scoreMap[row.deal_id].score += row.vote;
          if (user && row.user_id === user.id) {
            scoreMap[row.deal_id].userVote = row.vote;
          }
        });

        setVotes((prev) => ({ ...prev, ...scoreMap }));
      });
  }, [loadedIds, user?.id]);

  const castVote = useCallback(async (dealId: string, value: 1 | -1) => {
    if (!user) return;

    const current = votes[dealId] || { score: 0, userVote: null };

    if (current.userVote === value) {
      // Remove vote
      await (supabase.from("deal_votes" as any) as any)
        .delete()
        .eq("deal_id", dealId)
        .eq("user_id", user.id);
      setVotes((prev) => ({
        ...prev,
        [dealId]: { score: current.score - value, userVote: null },
      }));
    } else {
      // Upsert
      await (supabase.from("deal_votes" as any) as any).upsert(
        { deal_id: dealId, user_id: user.id, vote: value },
        { onConflict: "deal_id,user_id" }
      );
      setVotes((prev) => ({
        ...prev,
        [dealId]: {
          score: current.score - (current.userVote || 0) + value,
          userVote: value,
        },
      }));
    }
  }, [user, votes]);

  return React.createElement(
    VotesContext.Provider,
    { value: { votes, loadVotes, vote: castVote } },
    children
  );
}

/** Hook for a single deal card */
export function useDealVotes(dealId: string) {
  const ctx = useContext(VotesContext);
  if (!ctx) {
    // Fallback if no provider (shouldn't happen)
    return { score: 0, userVote: null as number | null, vote: async (_v: 1 | -1) => {} };
  }
  const data = ctx.votes[dealId] || { score: 0, userVote: null };
  return {
    score: data.score,
    userVote: data.userVote,
    vote: (value: 1 | -1) => ctx.vote(dealId, value),
  };
}

/** Hook to trigger batch loading */
export function useLoadVotes(dealIds: string[]) {
  const ctx = useContext(VotesContext);
  useEffect(() => {
    if (ctx && dealIds.length > 0) {
      ctx.loadVotes(dealIds);
    }
  }, [dealIds.join(",")]);
}
