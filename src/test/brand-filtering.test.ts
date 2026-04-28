import { describe, expect, it } from "vitest";
import { inferBrand } from "@/lib/brand-normalization";
import { matchesMerchant } from "@/lib/gender-context";

describe("brand and merchant filtering — anti-regression", () => {
  it("ne classe pas en Nike les marques qui contiennent seulement des mots génériques", () => {
    expect(inferBrand("adidas Sportswear", "WMNS Spiritain 2000")).toBe("adidas");
    expect(inferBrand("ASICS SportStyle", "WMNS GT-2160")).toBe("ASICS");
    expect(inferBrand("ASICS SportStyle", "WMNS Gel-NYC 2.0")).toBe("ASICS");
  });

  it("conserve Nike quand la marque brute est réellement Nike Sportswear", () => {
    expect(inferBrand("Nike Sportswear", "Club Fleece Hoodie")).toBe("Nike");
  });

  it("retourne 'Non classé' quand seuls des tokens génériques sont fournis", () => {
    expect(inferBrand("Sportswear", "")).toBe("Non classé");
    expect(inferBrand("WMNS Originals", "")).toBe("Non classé");
    expect(inferBrand("", "Training Top Generic")).toBe("Non classé");
    expect(inferBrand("Performance", "Training Top")).toBe("Non classé");
  });

  it("ne classe pas en Snipes par défaut quand la confiance est faible", () => {
    // Régression historique : la valeur par défaut était "Snipes",
    // ce qui polluait le filtre Snipes avec n'importe quel produit inconnu.
    expect(inferBrand("Inconnu XYZ", "Produit mystère 123")).toBe("Non classé");
  });

  it("filtre Sport Outlet malgré la différence tiret/espace du bouton partenaire", () => {
    expect(matchesMerchant({ source: "awin", merchant: "Sport Outlet FR" }, "sport-outlet")).toBe(true);
    expect(matchesMerchant({ source: "awin", merchant: "Sport Is Good FR" }, "sport-outlet")).toBe(false);
  });
});