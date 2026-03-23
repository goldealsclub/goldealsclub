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

/** Check if a Snipes image URL is a usable product photo (not a placeholder/logo) */
function isValidSnipesImage(url: string): boolean {
  if (!url.includes("asset.snipes.com")) return true;
  // Snipes placeholder thumbnails use small dimensions like w_527,h_274 with c_pad
  if (/w_\d{2,3},h_\d{2,3}/.test(url) && url.includes("c_pad")) return false;
  return true;
}

/** Upgrade Nike/Adidas thumbnail URLs to high-res & fix JD Sports framing */
function upgradeImageUrl(url: string): string {
  if (url.includes("static.nike.com") && url.includes("t_PDP_144")) {
    return url.replace("t_PDP_144_v1", "t_PDP_864_v1");
  }
  if (url.includes("assets.adidas.com") && url.includes("w_600")) {
    return url.replace("w_600", "w_960");
  }
  if (url.includes("amplience.net")) {
    return url;
  }
  if (url.includes("asset.snipes.com")) {
    return url
      .replace(/w_\d+/, "w_800")
      .replace(/h_\d+/, "h_800")
      .replace("c_pad", "c_fill")
      .replace(/,bo_\d+px_solid_rgb:[a-fA-F0-9]+/, "")
      .replace(/,b_rgb:[a-fA-F0-9]+/, "");
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

/** Infer category from title keywords when source category seems wrong */
function inferCategory(category: string, title: string): Category {
  const t = (title || "").toLowerCase();

  // Sneakers – check first so shoes aren't caught by other rules
  const sneakerKw = ["sneaker","basket ","baskets","chaussure","shoe","footwear","air max","air force","dunk","jordan ","yeezy","new balance ","574","990","2002r","gel-","old skool","sk8-","chuck taylor","converse","stan smith","superstar","forum","gazelle","samba","campus","ozweego","ultraboost","slide","mule","sandale","tong","tongs","adilette","claquette","arizona evA"];
  if (sneakerKw.some(k => t.includes(k))) return "sneakers";

  const tshirtKw = ["t-shirt","tee ","tee,","jersey","polo","maillot","débardeur","tank top","tanktop","shortsleeve","short sleeve","crew ","trikot","romper"];
  const hoodieKw = ["hoodie","sweat","capuche","pullover","crew neck","crewneck","sweater","sweatjacket"];
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","coupe-vent","bomber","puffer","vest ","gilet"];
  const pantsKw = ["pantalon","jogger","pant ","pants","legging","short ","shorts","bermuda","cargo","jogging","jean ","jeans","denim","flared","slim fit","baggy","pintuck"];
  const accessKw = ["casquette","cap ","sac ","bag ","bag,","backpack","chaussette","sock","bonnet","beanie","ceinture","belt","écharpe","scarf","gant","glove","porte","wallet","lunette","bandeau","headband","chapeau","hat ","9forty","9twenty","mvp ","new era","flexfit","durag","balaclava","bauchtasche","crossbody","neckwarmer","chain","bikini","trunk ","trunks"];

  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";
  if (hoodieKw.some(k => t.includes(k))) return "hoodies";
  if (jacketKw.some(k => t.includes(k))) return "vestes";
  if (pantsKw.some(k => t.includes(k))) return "pantalons";
  if (accessKw.some(k => t.includes(k))) return "accessoires";

  return category as Category;
}

/** Normalize raw JSON deals */
function normalizeDeals(raw: any[]): Deal[] {
  return raw.map((d, i) => {
    const gender = inferGender(d.gender || "", d.description || "", d.title || "");
    const category = inferCategory(d.category || "autres", d.title || "");
    let discountPercent = d.discount_percent ?? null;
    if (d.original_price && d.sale_price && d.original_price > d.sale_price) {
      discountPercent = Math.round(((d.original_price - d.sale_price) / d.original_price) * 100);
    }

    let dealLevel = d.deal_level || "promo-normale";
    let flameCount = d.flame_count ?? 1;
    if (discountPercent !== null) {
      if (discountPercent >= 50) { dealLevel = "hot-deal"; flameCount = 3; }
      else if (discountPercent >= 30) { dealLevel = "bon-deal"; flameCount = 2; }
      else { dealLevel = "promo-normale"; flameCount = 1; }
    }

    return {
      ...d,
      id: d.id || `deal-${i}-${(d.title || "").slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`,
      image_url: upgradeImageUrl(d.image_url || ""),
      category,
      gender,
      gender_label: genderToLabel(gender),
      source: d.source || "",
      currency: d.currency || "EUR",
      promo_start_date: d.promo_start_date || d.detected_at || "",
      promo_end_date: d.promo_end_date || null,
      discount_percent: discountPercent,
      deal_level: dealLevel as DealLevel,
      flame_count: flameCount,
    };
  });
}

// Mutable shared array – all importers see the same reference
export const deals: Deal[] = [];
let _loading = false;
let _loaded = false;
let _listeners: Array<() => void> = [];

/** Fetch and cache deals from JSON file */
export async function loadDeals(): Promise<Deal[]> {
  if (_loaded) return deals;
  if (_loading) {
    return new Promise((resolve) => {
      _listeners.push(() => resolve(deals));
    });
  }
  _loading = true;
  try {
    const resp = await fetch("/deals.json");
    const raw = await resp.json();
    const normalized = normalizeDeals(raw);
    deals.length = 0;
    deals.push(...normalized);
    _loaded = true;
  } catch (e) {
    console.error("Failed to load deals:", e);
    _loaded = true;
  }
  _loading = false;
  _listeners.forEach((fn) => fn());
  _listeners = [];
  return deals;
}

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
  const latest = deals.reduce((max, deal) => {
    const t = new Date(deal.detected_at || deal.promo_start_date).getTime();
    return t > max ? t : max;
  }, 0);
  return new Date(latest).toISOString();
}

// Sort by promo_start_date desc, then detected_at desc
export function sortByDate(a: Deal, b: Deal): number {
  const dateA = new Date(a.promo_start_date || a.detected_at).getTime();
  const dateB = new Date(b.promo_start_date || b.detected_at).getTime();
  if (dateB !== dateA) return dateB - dateA;
  return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
}
