import dealsJson from "../../public/deals.json";

export type DealLevel = "hot-deal" | "bon-deal" | "promo-normale";
export type Category = "sneakers" | "jackets" | "hoodies" | "tshirts" | "pants" | "accessories" | "autres";
export type Gender = "men" | "women" | "kids" | "unisex";

export interface Deal {
  id: string;
  title: string;
  brand: string;
  category: Category;
  sale_price: number;
  original_price: number;
  discount_percent: number;
  image_url: string;
  product_url: string;
  merchant: string;
  description: string;
  is_super_deal: boolean;
  deal_level: DealLevel;
  gender: Gender;
  gender_label: string;
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
];

const trustedMerchants = new Set(sellers.filter(s => s.trusted).map(s => s.name));

export function isTrustedMerchant(merchant: string): boolean {
  return trustedMerchants.has(merchant);
}

export const deals: Deal[] = dealsJson as Deal[];

export const categoryList: { key: Category; image: string }[] = [
  { key: "sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop" },
  { key: "jackets", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop" },
  { key: "hoodies", image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop" },
  { key: "tshirts", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop" },
  { key: "pants", image: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&h=400&fit=crop" },
  { key: "accessories", image: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop" },
];

// Helpers for sections
export const hotDeals = deals.filter(d => d.deal_level === "hot-deal");
export const bonDeals = deals.filter(d => d.deal_level === "bon-deal");
export const promoNormales = deals.filter(d => d.deal_level === "promo-normale");
