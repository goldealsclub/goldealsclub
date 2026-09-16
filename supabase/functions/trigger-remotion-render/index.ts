// Déclenche le rendu vidéo officiel (pipeline Remotion) via GitHub Actions.
// Le site n'exécute plus de rendu navigateur : on lance exactement le même
// script et les mêmes paramètres que le rendu automatique quotidien.
// L'appel GitHub passe par le connecteur (gateway) : aucun token à gérer.
import { corsHeaders, requireAdminOrService } from "../_shared/auth.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return auth.response;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GITHUB_API_KEY = Deno.env.get("GITHUB_API_KEY");
  const repo = Deno.env.get("GITHUB_REPO"); // format "owner/repo"
  if (!LOVABLE_API_KEY || !GITHUB_API_KEY) {
    return json(400, {
      error: "missing_connection",
      message: "La connexion GitHub n'est pas liée au projet.",
    });
  }
  if (!repo) {
    return json(400, {
      error: "missing_config",
      message: "GITHUB_REPO doit être configuré (format owner/repo).",
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const style = String(body.style ?? "adidas");
  if (!["adidas", "zara", "nike"].includes(style)) {
    return json(400, { error: "invalid_style" });
  }
  const ref = String(body.ref ?? Deno.env.get("GITHUB_REF_NAME") ?? "main");
  const workflow = "daily-tiktok-video.yml";

  const res = await fetch(
    `https://connector-gateway.lovable.dev/github/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GITHUB_API_KEY,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs: { style } }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return json(502, { error: "dispatch_failed", status: res.status, detail: text.slice(0, 500) });
  }

  return json(200, {
    ok: true,
    style,
    ref,
    runs_url: `https://github.com/${repo}/actions/workflows/${workflow}`,
  });
});
