import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { deals, Deal, Gender } from "@/lib/data";

type GenderFilter = Gender | "all";

interface GenderContextType {
  gender: GenderFilter;
  setGender: (g: GenderFilter) => void;
  filteredDeals: Deal[];
}

const GenderContext = createContext<GenderContextType>({
  gender: "all",
  setGender: () => {},
  filteredDeals: deals,
});

export const GenderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gender, setGenderState] = useState<GenderFilter>("all");
  const setGender = useCallback((g: GenderFilter) => setGenderState(g), []);

  const filteredDeals = useMemo(
    () => {
      if (gender === "all") return deals;
      return deals.filter((d) => d.gender === gender || d.gender === "unisex");
    },
    [gender]
  );

  return (
    <GenderContext.Provider value={{ gender, setGender, filteredDeals }}>
      {children}
    </GenderContext.Provider>
  );
};

export const useGender = () => useContext(GenderContext);
