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
    "title": "Reebok x HARRY POTTER Club C Enfants Sneakers 100206936",
    "brand": "Reebok",
    "originalPrice": 60,
    "salePrice": 10,
    "discountPercent": 83,
    "imageUrl": "https://images2.productserve.com/?w=1200&h=1200&bg=white&trim=5&t=letterbox&url=ssl%3Awww.sportspar.de%2Fmedia%2Fimage%2Fe1%2F13%2F94%2F100206936-1_1200x.jpg&feedId=48225&k=4e4ceafc3fec72dc76373ac25111b380e8858634",
    "category": "Sneakers",
    "currency": "EUR",
    "merchant": "Sport Outlet FR",
    "productUrl": "goldealsclub.com"
  },
  {
    "title": "Baskets Reebok Royal Comp 2",
    "brand": "Reebok",
    "originalPrice": 270,
    "salePrice": 64,
    "discountPercent": 76,
    "imageUrl": "https://cdn.blazimg.com/1800/product/r/e/reebok_cn0159_bleu_2.webp",
    "category": "Sneakers",
    "currency": "EUR",
    "merchant": "Sneakin FR",
    "productUrl": "goldealsclub.com"
  },
  {
    "title": "Reebok Royal Classic Jog 2.0 Enfants Sneakers 100033301-royal blue",
    "brand": "Reebok",
    "originalPrice": 40,
    "salePrice": 10,
    "discountPercent": 75,
    "imageUrl": "https://images2.productserve.com/?w=1200&h=1200&bg=white&trim=5&t=letterbox&url=ssl%3Awww.sportspar.de%2Fmedia%2Fimage%2F21%2F00%2Fb4%2F100033301-royal-1_1200x.jpg&feedId=48225&k=868a899a26a295332381b1feb94271823adaf724",
    "category": "Sneakers",
    "currency": "EUR",
    "merchant": "Sport Outlet FR",
    "productUrl": "goldealsclub.com"
  },
  {
    "title": "Reebok x Mountain Research Club C Mid II Unisexe Sneakers GX9046",
    "brand": "Reebok",
    "originalPrice": 150,
    "salePrice": 49.99,
    "discountPercent": 67,
    "imageUrl": "https://images2.productserve.com/?w=1200&h=1200&bg=white&trim=5&t=letterbox&url=ssl%3Awww.sportspar.de%2Fmedia%2Fimage%2Fff%2F66%2Fde%2FGX9046-11hMDsuYNUb4XJ_1200x.jpg&feedId=48225&k=3de8a73f48ba3963625ffa7b159cb8979cdea870",
    "category": "Sneakers",
    "currency": "EUR",
    "merchant": "Sport Outlet FR",
    "productUrl": "goldealsclub.com"
  },
  {
    "title": "Reebok x Maharishi LT Court Hemp Unisexe Sneakers GZ9587",
    "brand": "Reebok",
    "originalPrice": 130,
    "salePrice": 49.99,
    "discountPercent": 62,
    "imageUrl": "https://images2.productserve.com/?w=1200&h=1200&bg=white&trim=5&t=letterbox&url=ssl%3Awww.sportspar.de%2Fmedia%2Fimage%2Fea%2Fc8%2Fde%2FGZ9587-1_1200x.jpg&feedId=48225&k=99e5445916aecb813d99da40023d9c1e25b88580",
    "category": "Sneakers",
    "currency": "EUR",
    "merchant": "Sport Outlet FR",
    "productUrl": "goldealsclub.com"
  }
];

export const brandLogos: Record<string, string> = {
  "Nike": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>NIKE</text></svg>",
  "adidas": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>adidas</text></svg>",
  "Jordan": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>JORDAN</text></svg>",
  "New Balance": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>NB</text></svg>",
  "Puma": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>PUMA</text></svg>",
  "Reebok": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>Reebok</text></svg>"
};
