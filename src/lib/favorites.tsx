import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface FavoritesContextType {
  favorites: Set<string>;
  toggle: (id: string) => void;
  isFav: (id: string) => boolean;
}

const STORAGE_KEY = "goldeals-favorites";

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveFavorites(favs: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
  } catch {}
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggle: () => {},
  isFav: () => false,
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: "Retiré des favoris" });
      } else {
        next.add(id);
        toast({ title: "Ajouté aux favoris ♥" });
      }
      saveFavorites(next);
      return next;
    });
  }, []);
  const isFav = useCallback((id: string) => favorites.has(id), [favorites]);
  return <FavoritesContext.Provider value={{ favorites, toggle, isFav }}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
