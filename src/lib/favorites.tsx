import React, { createContext, useContext, useState, useCallback } from "react";

interface FavoritesContextType {
  favorites: Set<string>;
  toggle: (id: string) => void;
  isFav: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggle: () => {},
  isFav: () => false,
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const isFav = useCallback((id: string) => favorites.has(id), [favorites]);
  return <FavoritesContext.Provider value={{ favorites, toggle, isFav }}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
