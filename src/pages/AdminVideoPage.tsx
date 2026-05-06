import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, RefreshCw, ArrowLeft } from "lucide-react";

type Deal = {
  id: string;
  title: string;
  brand: string;
  merchant: string;
  sale_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string;
  image_url: string;
  url: string;
};

type Brief = {
  brief_date: string;
  focus_brand: string;
  deals: Deal[];
  caption: string;
  hashtags: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const SEC_PER_DEAL = 5; // 5 deals × 5s = 25s + 2.5s intro + 2.5s outro = 30s
const INTRO = 2.5;
const OUTRO = 2.5;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  total: number,
  brief: Brief,
  images: (HTMLImageElement | null)[],
) {
  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1a1a");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // INTRO
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    ctx.globalAlpha = k;
    ctx.fillStyle = "#f5f1ea";
    ctx.font = "900 96px 'Inter','Helvetica',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GOLDEALS", W / 2, H / 2 - 40);
    ctx.fillStyle = "#c9a870";
    ctx.font = "600 56px 'Inter','Helvetica',sans-serif";
    ctx.fillText("CLUB", W / 2, H / 2 + 40);
    ctx.fillStyle = "#999";
    ctx.font = "400 36px 'Inter','Helvetica',sans-serif";
    ctx.fillText(`Top deals — ${new Date(brief.brief_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`, W / 2, H / 2 + 130);
    ctx.globalAlpha = 1;
    return;
  }

  // OUTRO
  if (t > total - OUTRO) {
    const k = easeOut((t - (total - OUTRO)) / OUTRO);
    ctx.globalAlpha = k;
    ctx.fillStyle = "#f5f1ea";
    ctx.font = "900 88px 'Inter','Helvetica',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tous les deals sur", W / 2, H / 2 - 40);
    ctx.fillStyle = "#c9a870";
    ctx.font = "900 84px 'Inter','Helvetica',sans-serif";
    ctx.fillText("goldealsclub.com", W / 2, H / 2 + 60);
    ctx.globalAlpha = 1;
    return;
  }

  // DEALS
  const elapsed = t - INTRO;
  const idx = Math.min(brief.deals.length - 1, Math.floor(elapsed / SEC_PER_DEAL));
  const localT = elapsed - idx * SEC_PER_DEAL;
  const deal = brief.deals[idx];
  const img = images[idx];

  // Slide-in
  const slide = easeOut(Math.min(1, localT / 0.5));
  const yOffset = (1 - slide) * 80;
  ctx.globalAlpha = slide;

  // Image card
  const cardX = 60;
  const cardY = 200 + yOffset;
  const cardW = W - 120;
  const cardH = 1100;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  (ctx as any).roundRect?.(cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  if (img) {
    // contain
    const ratio = Math.min((cardW - 80) / img.width, (cardH - 80) / img.height);
    const iw = img.width * ratio;
    const ih = img.height * ratio;
    ctx.drawImage(img, cardX + (cardW - iw) / 2, cardY + (cardH - ih) / 2, iw, ih);
  }

  // Rank badge
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(cardX + 80, cardY + 80, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a870";
  ctx.font = "900 56px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(idx + 1), cardX + 80, cardY + 80);
  ctx.textBaseline = "alphabetic";

  // Brand
  ctx.fillStyle = "#f5f1ea";
  ctx.font = "900 72px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(deal.brand.toUpperCase(), W / 2, cardY + cardH + 110);

  // Discount
  ctx.fillStyle = "#c9a870";
  ctx.font = "900 140px 'Inter',sans-serif";
  ctx.fillText(`-${Math.round(Number(deal.discount_percent || 0))}%`, W / 2, cardY + cardH + 280);

  // Prices
  if (deal.sale_price && deal.original_price) {
    ctx.fillStyle = "#fff";
    ctx.font = "700 56px 'Inter',sans-serif";
    const cur = deal.currency === "EUR" ? "€" : deal.currency;
    const saleTxt = `${Number(deal.sale_price).toFixed(2)} ${cur}`;
    const origTxt = `${Number(deal.original_price).toFixed(2)} ${cur}`;
    const sw = ctx.measureText(saleTxt).width;
    const ow = ctx.measureText(origTxt).width;
    const gap = 40;
    const totalW = sw + ow + gap;
    const startX = (W - totalW) / 2;
    ctx.fillText(saleTxt, startX + sw / 2, cardY + cardH + 380);
    ctx.fillStyle = "#888";
    ctx.fillText(origTxt, startX + sw + gap + ow / 2, cardY + cardH + 380);
    // strike
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX + sw + gap, cardY + cardH + 360);
    ctx.lineTo(startX + sw + gap + ow, cardY + cardH + 360);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

export default function AdminVideoPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [editableCaption, setEditableCaption] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.title = "Vidéo du jour — Admin";
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  const loadBrief = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_video_briefs")
      .select("*")
      .eq("brief_date", today)
      .maybeSingle();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    if (data) {
      setBrief(data as Brief);
      setEditableCaption(`${data.caption}\n\n${data.hashtags}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadBrief();
  }, [isAdmin]);

  const regenerate = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("prepare-daily-video-brief");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Brief régénéré" });
    await loadBrief();
  };

  const renderVideo = async () => {
    if (!brief) return;
    setRendering(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Preload images via deals-image-proxy if needed; here we use direct (CORS may fail)
      // Fallback: use a known-good proxy or allow taint
      const images = await Promise.all(
        brief.deals.map((d) =>
          loadImage(d.image_url).catch(() => null),
        ),
      );

      const totalDeals = Math.min(brief.deals.length, 5);
      const total = INTRO + totalDeals * SEC_PER_DEAL + OUTRO;
      const totalFrames = Math.floor(total * FPS);

      const stream = (canvas as any).captureStream(FPS) as MediaStream;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      recorder.start();

      // Render frame by frame in real-time-ish
      const start = performance.now();
      for (let f = 0; f < totalFrames; f++) {
        const t = f / FPS;
        drawFrame(ctx, t, total, brief, images);
        setProgress(Math.round((f / totalFrames) * 100));
        // wait until real time matches
        const target = start + (f / FPS) * 1000;
        const now = performance.now();
        if (target > now) await new Promise((r) => setTimeout(r, target - now));
      }
      // Ensure last frame captured
      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();

      const blob = await done;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProgress(100);
      toast({ title: "Vidéo prête !" });
    } catch (e: any) {
      toast({ title: "Échec du rendu", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRendering(false);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(editableCaption);
    toast({ title: "Caption copiée" });
  };

  if (isAdmin === null) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Admin
        </Link>
        <Button variant="outline" size="sm" onClick={regenerate} disabled={loading || rendering}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Régénérer brief
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2">Vidéo du jour</h1>
      <p className="text-muted-foreground mb-6">
        Format 9:16 vertical · 30 s · prêt pour TikTok / Reels
      </p>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && !brief && (
        <div className="border rounded-lg p-6 text-center">
          <p className="mb-4">Aucun brief pour aujourd'hui.</p>
          <Button onClick={regenerate}>Générer maintenant</Button>
        </div>
      )}

      {!loading && brief && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="border rounded-lg p-4 mb-4">
              <h2 className="font-semibold mb-2">Sélection ({brief.deals.length})</h2>
              <p className="text-sm text-muted-foreground mb-3">Marque mise en avant : <strong>{brief.focus_brand}</strong></p>
              <ul className="space-y-2 text-sm">
                {brief.deals.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="font-bold w-6">{i + 1}.</span>
                    <img src={d.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{d.brand} — {d.title}</div>
                      <div className="text-xs text-muted-foreground">-{Math.round(Number(d.discount_percent))}% · {d.merchant}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Caption</h2>
                <Button size="sm" variant="ghost" onClick={copyCaption}><Copy className="h-4 w-4" /></Button>
              </div>
              <Textarea
                value={editableCaption}
                onChange={(e) => setEditableCaption(e.target.value)}
                rows={10}
                className="text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-3">Rendu vidéo</h2>
              <canvas ref={canvasRef} className="w-full max-w-[270px] mx-auto aspect-[9/16] bg-black rounded" />
              {rendering && (
                <div className="mt-3">
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-center mt-2 text-muted-foreground">Rendu en cours… {progress}%</p>
                </div>
              )}
              <Button className="w-full mt-3" onClick={renderVideo} disabled={rendering}>
                {rendering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendu…</> : "Générer la vidéo"}
              </Button>

              {videoUrl && (
                <div className="mt-4 space-y-2">
                  <video src={videoUrl} controls className="w-full max-w-[270px] mx-auto rounded" />
                  <Button asChild className="w-full" variant="default">
                    <a href={videoUrl} download={`goldeals-${brief.brief_date}.webm`}>
                      <Download className="h-4 w-4 mr-2" /> Télécharger .webm
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Astuce : convertis en .mp4 avec un outil en ligne (cloudconvert) avant de poster sur TikTok/Insta si besoin.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
