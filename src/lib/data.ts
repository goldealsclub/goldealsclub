import { inferBrand } from "@/lib/brand-normalization";

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
  affiliate_url: string | null;
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

/** Check if an image URL is usable (not empty) */
function isValidImage(url: string): boolean {
  return !!url && url.trim() !== "";
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
  const combined = ` ${desc} ${ttl} `;

  // Enfant-specific patterns — check FIRST since "Enfant" in title is definitive
  const enfantKw = ["pour ado","pour enfant"," enfant","enfants","enfant ",
    "kids","junior","bébé","nourrisson","toddler","infant","little kids",
    "big kids","td ","ps ","gs ","(gs)","(td)","(ps)","youth",
    "jeune enfant","petit enfant","newborn","nouveau-né",
    "tee & short set","short set ","kinder"];
  const enfantExclude = ["baby tee","bra ","crop","robe di kappa"];
  if (enfantKw.some(k => combined.includes(k)) && !enfantExclude.some(k => combined.includes(k))) return "enfant";

  // Femme-specific patterns
  const femmeKw = ["pour femme","pour fille","women","woman","wmns","w's ","ladies",
    "baby tee","bra ","brassière","legging","sports bra","sport bra","crop top",
    "cropped top","mini skirt","mini jupe","dress ","bikini top",
    "yoga ","maternity","enceinte","low waist"];
  const femmeExclude = ["robe di kappa"];
  if (femmeKw.some(k => combined.includes(k)) && !femmeExclude.some(k => combined.includes(k))) return "femme";

  // Homme-specific patterns
  if (combined.includes("pour homme") || combined.includes("pour garçon") || combined.includes("men's") || combined.includes("for men")) {
    return "homme";
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
  const t = ` ${(title || "").toLowerCase()} `;

  // 1. Jackets FIRST – "Short Puffer Jacket" must not match "short " in pants
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","wind breaker","windrunner","coupe-vent","bomber","puffer","gilet","weste","overshirt","vest ","anorak","softshell","teddy ","cagoule","firebird tt","jacke ","sherpa","traningsjacke","sst tt","cardigan","mount hope","winterized","wr fz","adverzip"];
  if (jacketKw.some(k => t.includes(k))) return "vestes";

  // 2. Hoodies — exclude items that also match pants/shorts/skirt keywords
  const hoodieKw = ["hoodie","hooded-","sweatshirt","sweat ","sweat,","sweats ","capuche","pullover","crew neck","crewneck","sweater","sweatjacket","tracktop","track top","trainingstop","zip top","halfzip","half-zip","half zip","zipper ","flc po ","troyer"];
  const hoodieExclude = ["short","pant","jogger","legging","bermuda","cargo","jogging","jeans","jean ","tracksuit","track suit","sweatpant","skirt","jupe","robe ","dress "];
  if (hoodieKw.some(k => t.includes(k)) && !hoodieExclude.some(k => t.includes(k))) return "hoodies";

  // 2b. Fleece tops only (exclude fleece shorts/pants/skirts)
  if (t.includes("fleece") && !hoodieExclude.some(k => t.includes(k))) return "hoodies";

  // 3. Pants — use pantsExclude to avoid "shorts" matching "shortsleeve"
  const pantsKw = ["pantalon","jogger","pant ","pants","legging","shorts","bermuda","cargo","jogging","jean ","jeans","flared","flare ","slim fit","baggy","survêtement","ensemble","trainingsanzüge","straight tp","tracküants","trackpant","track pant","sweatpant","sweatpants","training pant","tracksuit","trainingsanzug","track suit","inseam","trainingshose","jggr ","bootcut"];
  const pantsExclude = ["shortsleeve","short sleeve","short-sleeve"];
  if (pantsKw.some(k => t.includes(k)) && !pantsExclude.some(k => t.includes(k))) return "pantalons";

  // 4. T-shirts
  const tshirtKw = ["t-shirt","tee ","tee,","tee-","jersey","polo ","maillot","débardeur","tank top","tanktop","shortsleeve","short sleeve","short-sleeve"," crew ","trikot","chemise","pintuck t ","cropped t ","baseball shirt","baseballshirt"," shirt ","shirt,","crop top","v-neck","mesh button front","dress ","swingman"];
  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";

  // 5. Accessories – removed "knit "
  const accessKw = ["casquette","cap ","cap,","sac ","bag ","bag,","backpack","bagpack","chaussette","sock","socks","socken","bonnet","beanie","ceinture","belt","écharpe","scarf","gant","glove","porte","wallet","lunette","bandeau","headband","chapeau","hat ","9forty","9twenty","9fifty","59fifty","mvp ","new era","flexfit","durag","balaclava","bauchtasche","crossbody","neckwarmer","chain ","bikini","trunk ","trunks","cache-cou","cache-oreilles","brassard","bracelet","caleçon","boxer","boxers","briefs","underwear","slip ","underpant","sous-vêtement","blitzing","cuff ","fitted ","visor","brim","tumbler","stanley","quencher"," ball ","deflated","romper","hipbag","fanny","springer","duffle","airliner","casio","watch ","montre","snapback","bucket ","trucker","strapback","dad cap","waist bag","mini bag","shoulder bag","tote ","clutch","keychain","porte-clé","sunglasses","lunettes","g-shock","day pak","patrol pack","convertible hood","quarter sock"];
  if (accessKw.some(k => t.includes(k))) return "accessoires";

  // 6. Sneakers last
  const sneakerKw = ["sneaker","basket ","baskets","chaussure","shoe","footwear","air max","air force","dunk","jordan post","jordan 1 ","jordan 4 ","jordan 5 ","jordan 11","yeezy","new balance ","574","990","2002r","gel-","gel ","asics","old skool","sk8-","chuck taylor","converse","all star","stan smith","superstar","forum","gazelle","samba","campus","ozweego","ultraboost","slide","mule","sandale","tong","tongs","adilette","claquette","arizona eva","dr. martens","dr martens","vans ","era ","palermo","suede ","classic az","croco ","offcourt","slingback","reebok classic","puma cali","knu skool","lowpro","stealthform","cloudmonster","cloudswift","speedcross","xt-6","v2 ","made in ","fresh foam","fuelcell","1906","hoka ","clifton","bondi ","arahi","timberland ","premium 6","chukka","boat shoe","loafer","mocassin","espadrille","sabot","birkenstock","speedcat","mostro","predator sala","technochaos","spiritain","spiritian","adistar","megaride","ghostride","taekwondo","firebird lacett","spacer cutline","galaxy og","dame x ","tokyo w ","zx 500","total 90","vertebrae","gato ","sb chron","sb force","inhale ","fade nitro","arizona nylon","creeper","pluto ","neo run","citigo","shadow skate","venice skate","skate low","command ","club low ","h-street","lafranc","la franc","lxry 2k","lxyr 2k","89 2k","89 prm","89 up","89 tailor","89 classic","89 lxry","prime runner","goalgetter","goldenglow","session ","stadium 90","court graffik"," stag ","dc stag","infinite pro","echo ","aura ","ld-1000","play off speckle","jordan los","pipah plateau","classic ultra mini","classic mini ","tazz","disquette","lowmel","funkette","tazzelle","classic micro","cora sand","t-clip","spinor","l003 ","cloud 6","cloudtilt","cloudsurfer","cloudvista","cloudnova","xt-whisper","acs+","acs +","ava rover","avanti ","pointe ","hammer street","r400 ","club c ","skepta ","italia 70s","japan w ","anthony edwards","jordan remix","salomon ","on cloud","tasman","trekker","train 89","masters court","bedford","stone street","hylane","motion 6","cloudzone","sprint trekker","euro trekker","field trekker","lace up","spiridon","zoom spiridon","spizike","air zoom","air rift","pegasus","vomero","winflo","react ","flyknit","presto","huarache","tuned ","tn ","air more","uptempo","max 90","max 95","max 97","max 1 ","max 270","max 720"];
  if (sneakerKw.some(k => t.includes(k))) return "sneakers";

  return category as Category;
}



/** Normalize raw JSON deals, filtering out broken entries */
function normalizeDeals(raw: any[]): Deal[] {
  return raw
    .filter((d) => {
      // Exclude deals with no image
      if (!isValidImage(d.image_url || "")) return false;
      return true;
    })
    .map((d, i) => {
    const brand = inferBrand(d.brand || "", d.title || "");
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
      brand,
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
  { key: "vestes", image: catJackets },
  { key: "hoodies", image: catHoodies },
  { key: "t-shirts", image: catTshirts },
  { key: "pantalons", image: catPants },
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
