export type DealTier = "standard" | "super" | "gold";
export type Category = "sneakers" | "jackets" | "hoodies" | "tshirts" | "pants" | "accessories";

export interface Deal {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  discount: number;
  seller: string;
  sellerTrusted: boolean;
  category: Category;
  tier: DealTier;
  popularity: number;
  createdAt: string;
  description: string;
  url: string;
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

const productImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop",
];

const names = [
  "Nike Air Max 90 Essential",
  "Adidas Yeezy Boost 350 V2",
  "Jordan 1 Retro High OG",
  "North Face Nuptse Jacket",
  "Carhartt WIP Hooded Chase",
  "Stone Island Ghost Piece",
  "Nike Tech Fleece Jogger",
  "Off-White Logo Tee",
  "New Balance 550",
  "Acne Studios Hoodie",
  "Essentials Sweatpants",
  "Prada Re-Nylon Bucket Hat",
];

const categories: Category[] = ["sneakers", "jackets", "hoodies", "tshirts", "pants", "accessories"];
const tiers: DealTier[] = ["standard", "standard", "standard", "super", "super", "gold"];

export const deals: Deal[] = names.map((name, i) => {
  const originalPrice = Math.floor(Math.random() * 300) + 80;
  const discount = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60][Math.floor(Math.random() * 10)];
  const price = Math.round(originalPrice * (1 - discount / 100));
  return {
    id: `deal-${i + 1}`,
    name,
    image: productImages[i % productImages.length],
    price,
    originalPrice,
    discount,
    seller: sellers[i % sellers.length].name,
    sellerTrusted: true,
    category: categories[i % categories.length],
    tier: tiers[i % tiers.length],
    popularity: Math.floor(Math.random() * 500) + 50,
    createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    description: "Pièce incontournable de la saison, disponible à un prix exceptionnel. Qualité premium, design iconique. Offre limitée chez un vendeur vérifié.",
    url: "#",
  };
});

export const categoryList: { key: Category; image: string }[] = [
  { key: "sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop" },
  { key: "jackets", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop" },
  { key: "hoodies", image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop" },
  { key: "tshirts", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop" },
  { key: "pants", image: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&h=400&fit=crop" },
  { key: "accessories", image: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop" },
];
