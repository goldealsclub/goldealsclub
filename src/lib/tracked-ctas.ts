/**
 * Centralized registry of manually-tracked CTAs (campaign banners, editorial
 * pages, etc.) — anything that goes through Awin outside of the regular
 * product card flow.
 *
 * Used by the admin Awin Tracking tab to audit UTM/clickref consistency.
 *
 * IMPORTANT: keep these values in sync with the actual links rendered by the
 * components listed in `location`. The admin UI flags inconsistencies (missing
 * UTMs, mismatched campaign, etc.).
 */

import { buildAwinDeeplink } from "./awin-deeplink";

export type TrackedCta = {
  id: string;
  campaign: string;
  label: string;
  /** Where the CTA is rendered (file path / route) */
  location: string;
  merchant: "sportisgood";
  utm: {
    source: string;
    medium: string;
    campaign: string;
    content: string;
  };
  clickref: string;
  /** Final destination URL (without Awin wrapping) */
  targetUrl: string;
};

const sigBase = "https://sportisgood.fr/football/equipes/equipes-nationales";

const buildTarget = (brandParam: string, content: string, campaign: string) =>
  `${sigBase}?brand=${brandParam}` +
  `&utm_source=goldealsclub` +
  `&utm_medium=affiliate` +
  `&utm_campaign=${campaign}` +
  `&utm_content=${content}`;

export const TRACKED_CTAS: TrackedCta[] = [
  {
    id: "wc2026-adidas-banner",
    campaign: "worldcup2026",
    label: "Maillots adidas — Bannière home",
    location: "src/components/WorldCupBanner.tsx",
    merchant: "sportisgood",
    utm: {
      source: "goldealsclub",
      medium: "affiliate",
      campaign: "worldcup2026",
      content: "banner-adidas",
    },
    clickref: "worldcup2026-adidas-banner",
    targetUrl: buildTarget("adidas", "banner-adidas", "worldcup2026"),
  },
  {
    id: "wc2026-puma-banner",
    campaign: "worldcup2026",
    label: "Maillots Puma — Bannière home",
    location: "src/components/WorldCupBanner.tsx",
    merchant: "sportisgood",
    utm: {
      source: "goldealsclub",
      medium: "affiliate",
      campaign: "worldcup2026",
      content: "banner-puma",
    },
    clickref: "worldcup2026-puma-banner",
    targetUrl: buildTarget("Puma", "banner-puma", "worldcup2026"),
  },
  {
    id: "wc2026-adidas-page",
    campaign: "worldcup2026",
    label: "Maillots adidas — Page éditoriale",
    location: "src/pages/WorldCup2026Page.tsx",
    merchant: "sportisgood",
    utm: {
      source: "goldealsclub",
      medium: "affiliate",
      campaign: "worldcup2026",
      content: "page-adidas",
    },
    clickref: "worldcup2026-adidas-page",
    targetUrl: buildTarget("adidas", "page-adidas", "worldcup2026"),
  },
  {
    id: "wc2026-puma-page",
    campaign: "worldcup2026",
    label: "Maillots Puma — Page éditoriale",
    location: "src/pages/WorldCup2026Page.tsx",
    merchant: "sportisgood",
    utm: {
      source: "goldealsclub",
      medium: "affiliate",
      campaign: "worldcup2026",
      content: "page-puma",
    },
    clickref: "worldcup2026-puma-page",
    targetUrl: buildTarget("Puma", "page-puma", "worldcup2026"),
  },
];

/** Awin-wrapped final URL ready to open. */
export function getCtaAwinUrl(cta: TrackedCta): string {
  return buildAwinDeeplink(cta.targetUrl, cta.clickref, cta.merchant);
}

/** Audit a CTA: returns a list of issues (empty = OK). */
export function auditCta(cta: TrackedCta): string[] {
  const issues: string[] = [];
  if (!cta.utm.source) issues.push("utm_source manquant");
  if (!cta.utm.medium) issues.push("utm_medium manquant");
  if (!cta.utm.campaign) issues.push("utm_campaign manquant");
  if (!cta.utm.content) issues.push("utm_content manquant");
  if (!cta.clickref) issues.push("clickref manquant");
  if (cta.utm.campaign !== cta.campaign) {
    issues.push(`utm_campaign (${cta.utm.campaign}) ≠ campaign (${cta.campaign})`);
  }
  if (!cta.clickref.startsWith(cta.campaign)) {
    issues.push(`clickref doit débuter par "${cta.campaign}"`);
  }
  // Ensure UTMs are present in the target URL
  try {
    const u = new URL(cta.targetUrl);
    (["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const).forEach((k) => {
      const v = u.searchParams.get(k);
      const expected = cta.utm[k.replace("utm_", "") as keyof TrackedCta["utm"]];
      if (v !== expected) issues.push(`${k} URL (${v ?? "∅"}) ≠ registre (${expected})`);
    });
  } catch {
    issues.push("targetUrl invalide");
  }
  return issues;
}
