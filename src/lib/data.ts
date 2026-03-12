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

/** Upgrade Nike/Adidas thumbnail URLs to high-res & fix JD Sports framing */
function upgradeImageUrl(url: string): string {
  if (url.includes("static.nike.com") && url.includes("t_PDP_144")) {
    return url.replace("t_PDP_144_v1", "t_PDP_864_v1");
  }
  if (url.includes("assets.adidas.com") && url.includes("w_600")) {
    return url.replace("w_600", "w_960");
  }
  // JD Sports / Amplience: force background color to match site bg (warm cream #f5f0eb)
  if (url.includes("amplience.net")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}bg=f5f0eb`;
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

import catSneakers from "@/assets/cat-sneakers.jpg";
import catJackets from "@/assets/cat-jackets.jpg";
import catHoodies from "@/assets/cat-hoodies.jpg";
import catTshirts from "@/assets/cat-tshirts.jpg";
import catPants from "@/assets/cat-pants.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";

export const categoryList: { key: Category; image: string }[] = [
  { key: "sneakers", image: catSneakers },
  { key: "jackets", image: catJackets },
  { key: "hoodies", image: catHoodies },
  { key: "tshirts", image: catTshirts },
  { key: "pantalons", image: catPants },
  { key: "vestes", image: catJackets },
  { key: "accessoires", image: catAccessories },
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
