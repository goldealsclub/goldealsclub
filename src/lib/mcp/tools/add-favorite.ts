import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "add_favorite",
  title: "Save a deal to favorites",
  description: "Save a deal to the signed-in user's GOLDEALS CLUB favorites.",
  inputSchema: { deal_id: z.string().describe("The deal id to save.") },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ deal_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("favorites")
      .upsert({ user_id: ctx.getUserId(), deal_id }, { onConflict: "user_id,deal_id" })
      .select("deal_id,created_at");
    if (error) return errorResult(error.message);
    return jsonResult({ saved: true, deal_id }, { favorite: data?.[0] ?? { deal_id } });
  },
});
