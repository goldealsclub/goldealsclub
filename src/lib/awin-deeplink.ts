/**
 * Awin deeplink builder.
 *
 * Wraps any merchant URL into an Awin tracked deeplink so commissions are
 * properly attributed to GOLDEALS CLUB (publisher 2806680).
 *
 * Format: https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&clickref={ref}&ued={encodedUrl}
 */

const AWIN_PUBLISHER_ID = "2806680"; // GOLDEALS CLUB
const AWIN_BASE = "https://www.awin1.com/cread.php";

/** Known Awin merchant IDs (advertiser → ID). */
const AWIN_MERCHANT_IDS = {
  sportisgood: "61919",
} as const;

export type AwinMerchantKey = keyof typeof AWIN_MERCHANT_IDS;

/**
 * Build an Awin deeplink for a given target URL and merchant.
 * Falls back to the merchant URL if we don't know the Awin merchant ID.
 *
 * @param targetUrl  Final destination URL on the merchant site
 * @param clickref   Stable identifier surfaced in Awin reports (e.g. "worldcup2026-adidas")
 * @param merchant   Merchant key. Defaults to "sportisgood".
 */
export function buildAwinDeeplink(
  targetUrl: string,
  clickref: string,
  merchant: AwinMerchantKey = "sportisgood",
): string {
  const merchantId = AWIN_MERCHANT_IDS[merchant];
  if (!merchantId || !targetUrl) return targetUrl;

  const params = new URLSearchParams({
    awinmid: merchantId,
    awinaffid: AWIN_PUBLISHER_ID,
    clickref: clickref,
    ued: targetUrl,
  });

  return `${AWIN_BASE}?${params.toString()}`;
}
