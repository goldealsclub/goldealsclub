import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DEAL_FIELDS, errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "search_deals",
  title: "Search deals",
  description:
    "Search GOLDEALS CLUB fashion, streetwear and sneaker deals by keyword, brand, category, gender, merchant, price or discount.",
  inputSchema: {
    query: z.string().optional().describe("Free-text search on the product title."),
    brand: z.string().optional().describe("Brand name, e.g. Nike, Adidas."),
    category: z.string().optional().describe("Category slug or label."),
    gender: z.string().optional().describe("Gender label, e.g. Homme, Femme, Unisexe."),
    merchant: z.string().optional().describe("Merchant/seller name, e.g. Snipes, JD Sports."),
    min_discount: z.number().optional().describe("Minimum discount percentage."),
    max_price: z.number().optional().describe("Maximum sale price."),
    super_deals_only: z.boolean().optional().describe("Only return super deals."),
    limit: z.number().optional().describe("Number of results, default 20, max 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 50);

    let q = supabaseForUser(ctx)
      .from("deals")
      .select(DEAL_FIELDS)
      .order("display_score", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (input.query) q = q.ilike("title", `%${input.query}%`);
    if (input.brand) q = q.ilike("brand", `%${input.brand}%`);
    if (input.category) q = q.ilike("category", `%${input.category}%`);
    if (input.gender) q = q.ilike("gender_label", `%${input.gender}%`);
    if (input.merchant) q = q.ilike("merchant", `%${input.merchant}%`);
    if (typeof input.min_discount === "number") q = q.gte("discount_percent", input.min_discount);
    if (typeof input.max_price === "number") q = q.lte("sale_price", input.max_price);
    if (input.super_deals_only) q = q.eq("is_super_deal", true);

    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { deals: data ?? [], count: data?.length ?? 0 });
  },
});
