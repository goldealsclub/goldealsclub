// Promo codes mapping by merchant (substring, case-insensitive match on deal.merchant)
// Add or update entries here when partners share new codes.

export interface PromoCode {
  code: string;
  description: string; // e.g. "-5% sur tout le site"
  discountLabel: string; // short label shown in badge, e.g. "-5%"
  /** Percentage discount applied to sale_price (e.g. 5 for -5%). Used to compute estimated final price. */
  discountPercent?: number;
  conditions?: string;
  expiresAt?: string; // ISO date
  url?: string; // optional landing URL
}

export interface MerchantPromo {
  /** Substring matched against deal.merchant (case-insensitive) */
  merchantMatch: string;
  /** Display name */
  merchantName: string;
  codes: PromoCode[];
}

export const PROMO_CODES: MerchantPromo[] = [
  {
    merchantMatch: "sportisgood",
    merchantName: "Sport Is Good",
    codes: [
      {
        code: "SIG5",
        description: "-5% sur l'ensemble du site",
        discountLabel: "-5%",
        discountPercent: 5,
        conditions: "Cumulable avec les promotions en cours.",
      },
    ],
  },
];

/** Find active promo codes for a given merchant string. */
export function getPromoCodesForMerchant(merchant: string | null | undefined): PromoCode[] {
  if (!merchant) return [];
  const m = merchant.toLowerCase();
  const now = Date.now();
  const matched = PROMO_CODES.find((p) => m.includes(p.merchantMatch.toLowerCase()));
  if (!matched) return [];
  return matched.codes.filter((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now);
}

/** Get all active promo entries (for the dedicated page). */
export function getAllActivePromos(): MerchantPromo[] {
  const now = Date.now();
  return PROMO_CODES
    .map((p) => ({
      ...p,
      codes: p.codes.filter((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now),
    }))
    .filter((p) => p.codes.length > 0);
}
