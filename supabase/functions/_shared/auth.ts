// Shared authorization helper for edge functions.
// Allows requests only when the caller is either:
//   - an authenticated admin (JWT with user_roles.role='admin'), OR
//   - a trusted internal caller using the project service-role key
//     (used by pg_cron jobs and server-side scripts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export type AuthOk = { ok: true; userId: string | null; isServiceRole: boolean };
export type AuthErr = { ok: false; response: Response };

/**
 * Returns { ok:true } when the caller is a service-role JWT or an admin user.
 * Otherwise returns a ready-to-return 401/403 Response.
 */
export async function requireAdminOrService(req: Request): Promise<AuthOk | AuthErr> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 1. Internal cron / server-to-server: pre-shared secret header.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCron = req.headers.get("x-cron-secret");
  if (cronSecret && providedCron && providedCron === cronSecret) {
    return { ok: true, userId: null, isServiceRole: true };
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: json(401, { error: "unauthorized" }) };
  }
  const token = authHeader.slice(7).trim();
  const payload = decodeJwtPayload(token);
  const role = payload && typeof payload.role === "string" ? (payload.role as string) : "";

  if (role === "service_role") {
    return { ok: true, userId: null, isServiceRole: true };
  }


  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await supabaseAuth.auth.getUser();
  const userId = userData?.user?.id || null;
  if (!userId) {
    return { ok: false, response: json(401, { error: "unauthorized" }) };
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return { ok: false, response: json(403, { error: "forbidden" }) };
  }
  return { ok: true, userId, isServiceRole: false };
}
