import dealsJson from "../../public/deals.json";

export type DealLevel = "hot-deal" | "bon-deal" | "promo-normale";
export type Category = "sneakers" | "jackets" | "hoodies" | "tshirts" | "t-shirts" | "pants" | "pantalons" | "accessories" | "accessoires" | "vestes" | "autres";
export type Gender = "homme" | "femme" | "enfant" | "unisexe";

export interface Deal {
  id: string;
  title: string;
  brand: string;
  category: Category;
  gender: Gender;
  gender_label: string;
  sale_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  image_url: string;
  product_url: string;
  merchant: string;
  source: string;
  currency: string;
  description: string;
  promo_start_date: string;
  promo_end_date: string | null;
  is_super_deal: boolean;
  deal_level: DealLevel;
  flame_count: number;
  popularity: number;
  saved: boolean;
  detected_at: string;
}

export interface Seller {
  name: string;
  logo: string;
  dealCount: number;
  trusted: boolean;
}

export const sellers: Seller[] = [
  { name: "Zalando", logo: "", dealCount: 42, trusted: true },
  { name: "END.", logo: "", dealCount: 28, trusted: true },
  { name: "SSENSE", logo: "", dealCount: 35, trusted: true },
  { name: "Farfetch", logo: "", dealCount: 31, trusted: true },
  { name: "Nike", logo: "", dealCount: 56, trusted: true },
  { name: "ASOS", logo: "", dealCount: 48, trusted: true },
  { name: "Adidas", logo: "", dealCount: 38, trusted: true },
];

export function isTrustedMerchant(merchant: string): boolean {
  for (const s of sellers) {
    if (s.trusted && merchant.toLowerCase().includes(s.name.toLowerCase())) return true;
  }
  return false;
}

/** Upgrade Nike/Adidas thumbnail URLs to high-res */
function upgradeImageUrl(url: string): string {
  if (url.includes("static.nike.com") && url.includes("t_PDP_144")) {
    return url.replace("t_PDP_144_v1", "t_PDP_864_v1");
  }
  if (url.includes("assets.adidas.com") && url.includes("w_600")) {
    return url.replace("w_600", "w_960");
  }
  return url;
}

/** Infer gender from description, falling back to the gender field */
function inferGender(genderField: string, description: string, title: string): Gender {
  const desc = (description || "").toLowerCase();
  const ttl = (title || "").toLowerCase();
  const combined = `${desc} ${ttl}`;

  if (combined.includes("pour femme") || combined.includes("pour fille") || combined.includes("women") || combined.includes("woman")) {
    return "femme";
  }
  if (combined.includes("pour homme") || combined.includes("pour garçon") || combined.includes("men's") || combined.includes("for men")) {
    return "homme";
  }
  if (combined.includes("pour ado") || combined.includes("pour enfant") || combined.includes("enfants") || combined.includes("kids") || combined.includes("junior") || combined.includes("bébé") || combined.includes("nourrisson")) {
    return "enfant";
  }

  // Fallback to the original gender field
  const g = (genderField || "").toLowerCase();
  if (g === "homme" || g === "men") return "homme";
  if (g === "femme" || g === "women") return "femme";
  if (g === "enfant" || g === "kids") return "enfant";
  if (g === "unisexe" || g === "unisex") return "unisexe";

  return "unisexe";
}

/** Derive gender_label from gender */
function genderToLabel(gender: Gender): string {
  switch (gender) {
    case "homme": return "Homme";
    case "femme": return "Femme";
    case "enfant": return "Enfant";
    case "unisexe": return "Unisexe";
    default: return "";
  }
}

/** Normalize raw JSON deals */
function normalizeDeals(raw: any[]): Deal[] {
  return raw.map((d, i) => {
    const gender = inferGender(d.gender || "", d.description || "", d.title || "");
    return {
      ...d,
      id: d.id || `deal-${i}-${(d.title || "").slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`,
      image_url: upgradeImageUrl(d.image_url || ""),
      gender,
      gender_label: genderToLabel(gender),
      source: d.source || "",
      currency: d.currency || "EUR",
      promo_start_date: d.promo_start_date || d.detected_at || "",
      promo_end_date: d.promo_end_date || null,
    };
  });
}

export const deals: Deal[] = normalizeDeals(dealsJson as any[]);

export const categoryList: { key: Category; image: string }[] = [
  { key: "sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop" },
  { key: "jackets", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop" },
  { key: "hoodies", image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop" },
  { key: "tshirts", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop" },
  { key: "pantalons", image: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&h=400&fit=crop" },
  { key: "vestes", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop" },
  { key: "accessoires", image: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop" },
];

/** Get the most recent deal date as the "last updated" timestamp */
export function getLastUpdatedDate(): string {
  if (deals.length === 0) return "";
  const latest = deals.reduce((max, d) => {
    const t = new Date(d.detected_at || d.promo_start_date).getTime();
    return t > max ? t : max;
  }, 0);
  return new Date(latest).toISOString();
}

// Sort by promo_start_date desc, then detected_at desc
function sortByDate(a: Deal, b: Deal): number {
  const dateA = new Date(a.promo_start_date || a.detected_at).getTime();
  const dateB = new Date(b.promo_start_date || b.detected_at).getTime();
  if (dateB !== dateA) return dateB - dateA;
  return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
}

export const hotDeals = deals.filter(d => d.deal_level === "hot-deal").sort(sortByDate);
export const bonDeals = deals.filter(d => d.deal_level === "bon-deal").sort(sortByDate);
export const promoNormales = deals.filter(d => d.deal_level === "promo-normale").sort(sortByDate);
