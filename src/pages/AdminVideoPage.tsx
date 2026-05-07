import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, RefreshCw, ArrowLeft, Swords, Share2 } from "lucide-react";

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

type Battle = {
  type: "battle";
  category: string;
  label: string;
  a: Deal;
  b: Deal;
};

type Brief = {
  brief_date: string;
  focus_brand: string;
  deals: Battle[];
  caption: string;
  hashtags: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const TOTAL_SEC = 15;
const INTRO = 1.5;
const OUTRO = 2;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function drawBattleFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  battle: Battle,
  imgA: HTMLImageElement | null,
  imgB: HTMLImageElement | null,
) {
  // Background gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1a1a");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // INTRO — VS reveal
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    ctx.globalAlpha = k;
    ctx.fillStyle = "#c9a870";
    ctx.font = "900 200px 'Inter','Helvetica',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", W / 2, H / 2);
    ctx.fillStyle = "#f5f1ea";
    ctx.font = "700 64px 'Inter',sans-serif";
    ctx.fillText(battle.label, W / 2, H / 2 + 180);
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // OUTRO
  if (t > TOTAL_SEC - OUTRO) {
    const k = easeOut((t - (TOTAL_SEC - OUTRO)) / OUTRO);
    ctx.globalAlpha = k;
    ctx.fillStyle = "#f5f1ea";
    ctx.font = "900 88px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tu choisis qui ?", W / 2, H / 2 - 40);
    ctx.fillStyle = "#c9a870";
    ctx.font = "900 76px 'Inter',sans-serif";
    ctx.fillText("goldealsclub.com", W / 2, H / 2 + 60);
    ctx.globalAlpha = 1;
    return;
  }

  // BATTLE — split screen
  const battleT = t - INTRO;
  const slide = easeOut(Math.min(1, battleT / 0.4));
  ctx.globalAlpha = slide;

  // Diagonal split background
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.45);
  ctx.lineTo(0, H * 0.55);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H * 0.55);
  ctx.lineTo(W, H * 0.45);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Diagonal divider line
  ctx.strokeStyle = "#c9a870";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.55);
  ctx.lineTo(W, H * 0.45);
  ctx.stroke();

  // Helper to draw one side
  const drawSide = (deal: Deal, img: HTMLImageElement | null, top: boolean) => {
    const cx = W / 2;
    const cy = top ? H * 0.22 : H * 0.78;
    const offset = top ? -W * (1 - slide) : W * (1 - slide);
    ctx.save();
    ctx.translate(offset, 0);

    // Image
    if (img) {
      const maxW = 700;
      const maxH = 540;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2 - 40, iw, ih);
    }

    // Brand
    ctx.fillStyle = "#f5f1ea";
    ctx.font = "900 88px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(deal.brand.toUpperCase(), cx, cy + 290);

    // Discount
    ctx.fillStyle = "#c9a870";
    ctx.font = "900 110px 'Inter',sans-serif";
    ctx.fillText(`-${Math.round(Number(deal.discount_percent || 0))}%`, cx, cy + 410);

    // Price
    if (deal.sale_price) {
      ctx.fillStyle = "#fff";
      ctx.font = "700 56px 'Inter',sans-serif";
      const cur = deal.currency === "EUR" ? "€" : deal.currency;
      ctx.fillText(`${Number(deal.sale_price).toFixed(2)} ${cur}`, cx, cy + 480);
    }
    ctx.restore();
  };

  drawSide(battle.a, imgA, true);
  drawSide(battle.b, imgB, false);

  // VS centered
  ctx.fillStyle = "#c9a870";
  ctx.font = "900 130px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Pulse
  const pulse = 1 + Math.sin(battleT * 8) * 0.05;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(pulse, pulse);
  ctx.fillText("VS", 0, 0);
  ctx.restore();
  ctx.textBaseline = "alphabetic";

  ctx.globalAlpha = 1;
}

export default function AdminVideoPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderingIdx, setRenderingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
  const [editableCaption, setEditableCaption] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.title = "Vidéos Hype Battle — Admin";
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return setIsAdmin(false);
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
      setBrief(data as unknown as Brief);
      setEditableCaption(`${data.caption}\n\n${data.hashtags}`);
    } else {
      setBrief(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadBrief();
  }, [isAdmin]);

  const regenerate = async () => {
    setLoading(true);
    setVideoUrls({});
    const { error } = await supabase.functions.invoke("prepare-daily-video-brief");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Brief régénéré" });
    await loadBrief();
  };

  const renderBattle = async (idx: number) => {
    if (!brief) return;
    const battle = brief.deals[idx];
    setRenderingIdx(idx);
    setProgress(0);
    setVideoUrls((prev) => {
      const n = { ...prev };
      delete n[idx];
      return n;
    });

    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const [imgA, imgB] = await Promise.all([loadImage(battle.a.image_url), loadImage(battle.b.image_url)]);

      const totalFrames = TOTAL_SEC * FPS;
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
      const start = performance.now();
      for (let f = 0; f < totalFrames; f++) {
        const t = f / FPS;
        drawBattleFrame(ctx, t, battle, imgA, imgB);
        setProgress(Math.round((f / totalFrames) * 100));
        const target = start + (f / FPS) * 1000;
        const now = performance.now();
        if (target > now) await new Promise((r) => setTimeout(r, target - now));
      }
      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();

      const blob = await done;
      const url = URL.createObjectURL(blob);
      setVideoUrls((prev) => ({ ...prev, [idx]: url }));
      setProgress(100);
      toast({ title: `Vidéo ${battle.label} prête !` });
    } catch (e: any) {
      toast({ title: "Échec du rendu", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRenderingIdx(null);
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
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Admin
        </Link>
        <Button variant="outline" size="sm" onClick={regenerate} disabled={loading || renderingIdx !== null}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Régénérer briefs
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Swords className="h-7 w-7" /> Hype Battle du jour
      </h1>
      <p className="text-muted-foreground mb-6">
        Une vidéo VS par catégorie · 9:16 · 15s · marques hype
      </p>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && (!brief || brief.deals.length === 0) && (
        <div className="border rounded-lg p-6 text-center">
          <p className="mb-4">Aucun battle disponible aujourd'hui (pas assez de deals hype par catégorie).</p>
          <Button onClick={regenerate}>Régénérer</Button>
        </div>
      )}

      {!loading && brief && brief.deals.length > 0 && (
        <>
          {/* Caption globale */}
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Caption (utilisable pour tous les posts)</h2>
              <Button size="sm" variant="ghost" onClick={copyCaption}><Copy className="h-4 w-4" /> Copier</Button>
            </div>
            <Textarea
              value={editableCaption}
              onChange={(e) => setEditableCaption(e.target.value)}
              rows={6}
              className="text-sm font-mono"
            />
          </div>

          {/* Canvas hidden — utilisé en rendu */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Une carte par battle */}
          <div className="grid md:grid-cols-3 gap-4">
            {brief.deals.map((battle, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="h-4 w-4" />
                  <h3 className="font-semibold">{battle.label}</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[battle.a, battle.b].map((d, i) => (
                    <div key={i} className="text-center">
                      <img src={d.image_url} alt="" className="w-full aspect-square object-cover rounded mb-1" />
                      <div className="text-xs font-bold uppercase">{d.brand}</div>
                      <div className="text-xs text-muted-foreground">-{Math.round(Number(d.discount_percent))}%</div>
                    </div>
                  ))}
                </div>

                {renderingIdx === idx && (
                  <div className="mb-2">
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">{progress}%</p>
                  </div>
                )}

                {!videoUrls[idx] && (
                  <Button
                    size="sm"
                    onClick={() => renderBattle(idx)}
                    disabled={renderingIdx !== null}
                    className="w-full"
                  >
                    {renderingIdx === idx ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendu…</>
                    ) : (
                      "🎬 Générer la vidéo"
                    )}
                  </Button>
                )}

                {videoUrls[idx] && (
                  <div className="space-y-2">
                    <video src={videoUrls[idx]} controls className="w-full rounded" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={videoUrls[idx]} download={`battle-${battle.category}-${brief.brief_date}.webm`}>
                          <Download className="h-4 w-4 mr-1" /> WebM
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const blob = await fetch(videoUrls[idx]).then((r) => r.blob());
                            const file = new File(
                              [blob],
                              `battle-${battle.category}-${brief.brief_date}.webm`,
                              { type: "video/webm" },
                            );
                            const nav: any = navigator;
                            if (nav.canShare && nav.canShare({ files: [file] })) {
                              await nav.share({
                                files: [file],
                                title: battle.label,
                                text: editableCaption,
                              });
                            } else {
                              await navigator.clipboard.writeText(editableCaption);
                              toast({
                                title: "Partage natif indisponible",
                                description: "Caption copiée. Télécharge la vidéo et poste-la manuellement.",
                              });
                            }
                          } catch (e: any) {
                            if (e?.name !== "AbortError") {
                              toast({ title: "Échec partage", description: e?.message || String(e), variant: "destructive" });
                            }
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-1" /> Partager
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Pour MP4 : <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" className="underline">cloudconvert</a>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Format .webm — accepté par TikTok et Instagram. Sinon convertis en .mp4 via cloudconvert.com
          </p>
        </>
      )}
    </div>
  );
}
