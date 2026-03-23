import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { Deal, Gender, loadDeals } from "@/lib/data";

type GenderFilter = Gender | "all";

interface GenderContextType {
  gender: GenderFilter;
  setGender: (g: GenderFilter) => void;
  filteredDeals: Deal[];
  loading: boolean;
}

const GenderContext = createContext<GenderContextType>({
  gender: "all",
  setGender: () => {},
  filteredDeals: [],
  loading: true,
});

export const GenderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gender, setGenderState] = useState<GenderFilter>("all");
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const setGender = useCallback((g: GenderFilter) => setGenderState(g), []);

  useEffect(() => {
    loadDeals().then((d) => {
      setAllDeals(d);
      setLoading(false);
    });
  }, []);

  const filteredDeals = useMemo(
    () => {
      if (gender === "all") return allDeals;
      return allDeals.filter((d) => d.gender === gender || d.gender === "unisexe");
    },
    [gender, allDeals]
  );

  return (
    <GenderContext.Provider value={{ gender, setGender, filteredDeals, loading }}>
      {children}
    </GenderContext.Provider>
  );
};

export const useGender = () => useContext(GenderContext);
