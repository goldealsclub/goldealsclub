export interface Deal {
  title: string;
  brand: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  imageUrl: string;
  category: string;
  currency: string;
  merchant: string;
  productUrl: string;
}

export const deals: Deal[] = [
  {
    title: "Sneaker Megaride",
    brand: "adidas",
    originalPrice: 169.99,
    salePrice: 70,
    discountPercent: 59,
    imageUrl: "https://asset.snipes.com/images/f_auto,q_100/w_527,h_274,c_pad,bo_16px_solid_rgb:f8f8f8,b_rgb:f8f8f8/02467408_1/Sneaker-Megaride",
    category: "Sneakers",
    currency: "EUR",
    merchant: "Snipes FR",
    productUrl: "goldealsclub.lovable.app",
  },
  {
    title: "Flight Fleece Graphics Hoodie",
    brand: "Jordan",
    originalPrice: 99.99,
    salePrice: 40,
    discountPercent: 60,
    imageUrl: "https://asset.snipes.com/images/f_auto,q_100/w_527,h_274,c_pad,bo_16px_solid_rgb:f8f8f8,b_rgb:f8f8f8/02393918_1/Flight-Fleece-Graphics-Hoodie",
    category: "Hoodies",
    currency: "EUR",
    merchant: "Snipes FR",
    productUrl: "goldealsclub.lovable.app",
  },
  {
    title: "Sportswear Essential Woven UV Longsleeve",
    brand: "Nike",
    originalPrice: 74.99,
    salePrice: 30,
    discountPercent: 60,
    imageUrl: "https://asset.snipes.com/images/f_auto,q_100/w_527,h_274,c_pad,bo_16px_solid_rgb:f8f8f8,b_rgb:f8f8f8/02377228_1/Sportswear-Essential-Woven-UV-Longsleeve-Vneck-Crew",
    category: "T-shirts",
    currency: "EUR",
    merchant: "Snipes FR",
    productUrl: "goldealsclub.lovable.app",
  },
  {
    title: "Tongs adilette",
    brand: "adidas",
    originalPrice: 44.99,
    salePrice: 15,
    discountPercent: 67,
    imageUrl: "https://asset.snipes.com/images/f_auto,q_100/w_527,h_274,c_pad,bo_16px_solid_rgb:f8f8f8,b_rgb:f8f8f8/02333156_1/Tongs-adilette",
    category: "Sneakers",
    currency: "EUR",
    merchant: "Snipes FR",
    productUrl: "goldealsclub.lovable.app",
  },
  {
    title: "Dri-Fit Performance Basic Crew (x6)",
    brand: "Nike",
    originalPrice: 17.99,
    salePrice: 7,
    discountPercent: 61,
    imageUrl: "https://asset.snipes.com/images/f_auto,q_100/w_527,h_274,c_pad,bo_16px_solid_rgb:f8f8f8,b_rgb:f8f8f8/02275705_1/6-PACK---Dri-Fit-Performance-Basic-Crew",
    category: "T-shirts",
    currency: "EUR",
    merchant: "Snipes FR",
    productUrl: "goldealsclub.lovable.app",
  },
];

// Brand logo URLs (official SVG logos)
export const brandLogos: Record<string, string> = {
  Nike: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
  adidas: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
  Jordan: "https://upload.wikimedia.org/wikipedia/en/3/37/Jumpman_logo.svg",
};
