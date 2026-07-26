import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DEAL_FIELDS, errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_favorites",
  title: "List my favorite deals",
  description: "List the deals the signed-in user has saved as favorites on GOLDEALS CLUB.",
  inputSchema: { limit: z.number().optional().describe("Number of favorites to return, default 50.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const max = Math.min(Math.max(Math.trunc(limit ?? 50), 1), 100);
    const supabase = supabaseForUser(ctx);

    const { data: favs, error } = await supabase
      .from("favorites")
      .select("deal_id,created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(max);
    if (error) return errorResult(error.message);
    if (!favs?.length) return jsonResult([], { favorites: [], count: 0 });

    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select(DEAL_FIELDS)
      .in("id", favs.map((f) => f.deal_id));
    if (dealsError) return errorResult(dealsError.message);

    const byId = new Map((deals ?? []).map((d: any) => [d.id, d]));
    const rows = favs.map((f) => ({ deal_id: f.deal_id, saved_at: f.created_at, deal: byId.get(f.deal_id) ?? null }));
    return jsonResult(rows, { favorites: rows, count: rows.length });
  },
});
