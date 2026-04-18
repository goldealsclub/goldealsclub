import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { Deal, Gender, loadDeals } from "@/lib/data";

type GenderFilter = Gender | "all";

/** Merchant filter key — null means "all merchants" */
export type MerchantFilter = string | null;

interface GenderContextType {
  gender: GenderFilter;
  setGender: (g: GenderFilter) => void;
  merchant: MerchantFilter;
  setMerchant: (m: MerchantFilter) => void;
  filteredDeals: Deal[];
  loading: boolean;
}

const GenderContext = createContext<GenderContextType>({
  gender: "all",
  setGender: () => {},
  merchant: null,
  setMerchant: () => {},
  filteredDeals: [],
  loading: true,
});

/** Match a deal against a merchant key (case-insensitive substring on source/merchant) */
function matchesMerchant(deal: Deal, key: string): boolean {
  const k = key.toLowerCase();
  const src = deal.source?.toLowerCase() || "";
  const merchant = deal.merchant?.toLowerCase() || "";
  return src.includes(k) || merchant.includes(k);
}

export const GenderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gender, setGenderState] = useState<GenderFilter>("all");
  const [merchant, setMerchantState] = useState<MerchantFilter>(null);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const setGender = useCallback((g: GenderFilter) => setGenderState(g), []);
  const setMerchant = useCallback((m: MerchantFilter) => setMerchantState(m), []);

  useEffect(() => {
    loadDeals().then((d) => {
      setAllDeals(d);
      setLoading(false);
    });
  }, []);

  const filteredDeals = useMemo(
    () => {
      let result = allDeals;
      if (gender !== "all") {
        result = result.filter((d) => d.gender === gender || d.gender === "unisexe");
      }
      if (merchant) {
        result = result.filter((d) => matchesMerchant(d, merchant));
      }
      return result;
    },
    [gender, merchant, allDeals]
  );

  return (
    <GenderContext.Provider value={{ gender, setGender, merchant, setMerchant, filteredDeals, loading }}>
      {children}
    </GenderContext.Provider>
  );
};

export const useGender = () => useContext(GenderContext);
