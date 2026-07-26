import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_deal",
  title: "Get deal details",
  description: "Fetch the full details of a single deal by its id, including description and purchase link.",
  inputSchema: { deal_id: z.string().describe("The deal id returned by search_deals.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deal_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult(`No deal found with id ${deal_id}.`);
    return jsonResult(data, { deal: data });
  },
});
