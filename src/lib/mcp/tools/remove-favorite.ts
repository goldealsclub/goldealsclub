import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "remove_favorite",
  title: "Remove a deal from favorites",
  description: "Remove a deal from the signed-in user's GOLDEALS CLUB favorites.",
  inputSchema: { deal_id: z.string().describe("The deal id to remove.") },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deal_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { error } = await supabaseForUser(ctx)
      .from("favorites")
      .delete()
      .eq("user_id", ctx.getUserId())
      .eq("deal_id", deal_id);
    if (error) return errorResult(error.message);
    return jsonResult({ removed: true, deal_id });
  },
});
