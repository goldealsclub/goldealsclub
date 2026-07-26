import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Supabase client scoped to the authenticated MCP caller (RLS runs as that user). */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated." }],
    isError: true,
  };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function jsonResult(data: unknown, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

export const DEAL_FIELDS =
  "id,title,brand,category,gender_label,sale_price,original_price,discount_percent,currency,merchant,image_url,product_url,affiliate_url,is_super_deal,deal_level,promo_end_date,detected_at";
