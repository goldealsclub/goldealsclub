// Déclenche le rendu vidéo officiel (pipeline Remotion) via GitHub Actions.
// Le site n'exécute plus de rendu navigateur : on lance exactement le même
// script et les mêmes paramètres que le rendu automatique quotidien.
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

  const token = Deno.env.get("GITHUB_DISPATCH_TOKEN");
  const repo = Deno.env.get("GITHUB_REPO"); // format "owner/repo"
  if (!token || !repo) {
    return json(400, {
      error: "missing_config",
      message: "GITHUB_DISPATCH_TOKEN et GITHUB_REPO doivent être configurés.",
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
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "goldeals-video-trigger",
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
