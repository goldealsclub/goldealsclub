import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "goldeals_recently_viewed";
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [viewedIds, setViewedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const addViewed = useCallback((dealId: string) => {
    setViewedIds((prev) => {
      const next = [dealId, ...prev.filter((id) => id !== dealId)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { viewedIds, addViewed };
}
