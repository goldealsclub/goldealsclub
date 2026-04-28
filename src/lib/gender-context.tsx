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

/** Match a deal against a merchant key (case-insensitive, hyphen/space tolerant). */
export function matchesMerchant(deal: Pick<Deal, "source" | "merchant">, key: string): boolean {
  const normalize = (value: string | null | undefined) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const k = normalize(key);
  const src = normalize(deal.source);
  const merchant = normalize(deal.merchant);
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
