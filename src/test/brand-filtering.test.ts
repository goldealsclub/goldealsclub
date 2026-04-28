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

  it("filtre Sport Outlet malgré la différence tiret/espace du bouton partenaire", () => {
    expect(matchesMerchant({ source: "awin", merchant: "Sport Outlet FR" }, "sport-outlet")).toBe(true);
    expect(matchesMerchant({ source: "awin", merchant: "Sport Is Good FR" }, "sport-outlet")).toBe(false);
  });
});