import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/track-event";

interface FavoritesContextType {
  favorites: Set<string>;
  toggle: (id: string) => void;
  isFav: (id: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "goldeals-favorites";

function loadLocalFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveLocalFavorites(favs: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
  } catch {}
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggle: () => {},
  isFav: () => false,
  loading: false,
  refresh: async () => {},
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(loadLocalFavorites);
  const [loading, setLoading] = useState(false);
  const syncedRef = useRef(false);

  const loadFromDb = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select("deal_id")
      .eq("user_id", user.id);

    if (!error && data) {
      const dbFavs = new Set(data.map((r) => r.deal_id));

      // On first login, merge localStorage favorites into DB
      if (!syncedRef.current) {
        const localFavs = loadLocalFavorites();
        const toSync = [...localFavs].filter((id) => !dbFavs.has(id));
        if (toSync.length > 0) {
          await supabase
            .from("favorites")
            .insert(toSync.map((deal_id) => ({ user_id: user.id, deal_id })));
          toSync.forEach((id) => dbFavs.add(id));
        }
        // Clear localStorage after merge
        localStorage.removeItem(STORAGE_KEY);
        syncedRef.current = true;
      }

      setFavorites(dbFavs);
    }
    setLoading(false);
  }, [user]);

  // Load favorites from DB when user logs in
  useEffect(() => {
    if (!user) {
      syncedRef.current = false;
      // Keep localStorage favorites when logged out
      setFavorites(loadLocalFavorites());
      return;
    }
    loadFromDb();
  }, [user, loadFromDb]);

  // Keep the list in sync when it changes elsewhere (other device, agent via MCP)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`favorites-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` },
        () => { loadFromDb(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadFromDb]);


  const toggle = useCallback(
    async (id: string) => {
      const wasAdded = !favorites.has(id);

      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);

        // Save to localStorage for non-auth users
        if (!user) saveLocalFavorites(next);

        return next;
      });

      toast({ title: wasAdded ? "Ajouté aux favoris ♥" : "Retiré des favoris" });
      trackEvent(wasAdded ? "favorite_add" : "favorite_remove", { dealId: id });

      // Sync to DB for authenticated users
      if (user) {
        if (wasAdded) {
          await supabase
            .from("favorites")
            .insert({ user_id: user.id, deal_id: id });
        } else {
          await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("deal_id", id);
        }
      }
    },
    [favorites, user]
  );

  const isFav = useCallback((id: string) => favorites.has(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFav, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
