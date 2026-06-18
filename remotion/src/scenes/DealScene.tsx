/**
 * DealScene — direction artistique pilotée par useStyle().
 *
 * Layouts :
 *  - "block-bottom"     (adidas) : grille + bloc ink en bas (prix XXL)
 *  - "full-bleed-serif" (zara)   : produit centré, titre serif, prix fin
 *  - "kinetic-card"     (nike)   : carte ink à droite, % géant orange
 */
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img, spring } from "remotion";
import type { Deal } from "../data";
import { brandLogos } from "../data";
import { snap, snapScale, gpuLayer } from "../lib/motion";
import { useStyle } from "../lib/style-context";

interface DealSceneProps {
  deal: Deal;
  index: number;
  total?: number;
}

const fmtPrice = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? `${r}` : r.toFixed(2);
};
const clamp = (t: number) => Math.max(0, Math.min(1, t));

export const DealScene: React.FC<DealSceneProps> = ({ deal, index, total = 5 }) => {
  const s = useStyle();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mul = s.motion.staggerMul;
  const ease = s.motion.easing;
  const useSpring = s.motion.useSpring;

  const enter = (delay: number, dur: number, fromY: number) => {
    if (useSpring) {
      const sp = spring({
        frame: frame - delay * mul, fps,
        config: { damping: 12, stiffness: 110 },
        durationInFrames: Math.round(dur * mul),
      });
      const t = clamp(sp);
      return { t, y: snap(interpolate(t, [0, 1], [fromY, 0])) };
    }
    const t = ease((frame - delay * mul) / (dur * mul));
    return { t, y: snap(interpolate(t, [0, 1], [fromY, 0])) };
  };

  const sale = Number(deal.salePrice ?? 0);
  const orig = Number(deal.originalPrice ?? 0);
  const hasOrig = orig > sale && sale > 0;
  const discount = hasOrig ? Math.round((1 - sale / orig) * 100) : 0;
  const brandUpper = (deal.brand || "").toUpperCase();
  const brandLogo = brandLogos[deal.brand];

  // Bloc bas
  const block = enter(18, 16, 320);
  // Header marque
  const head = enter(4, 12, -26);
  // Produit
  const img = enter(10, 18, 0);
  const imgScale = snapScale(interpolate(img.t, [0, 1], [0.94, 1]));
  const kenZoom = snapScale(interpolate(frame, [0, 130], [1.0, 1.06], { extrapolateRight: "clamp" }));
  const kenPanX = snap(interpolate(frame, [0, 130], [-6, 6], { extrapolateRight: "clamp" }));
  // Wordmark ghost
  const ghostT = clamp(ease((frame - 6 * mul) / (22 * mul)));
  const ghostX = snap(interpolate(frame, [0, 130], [-10, 10], { extrapolateRight: "clamp" }));
  // Titre
  const title = enter(22, 14, 20);
  // Prix
  const price = enter(30, 14, 0);
  const priceX = snap(interpolate(price.t, [0, 1], [120, 0]));
  // Chip discount
  const chip = enter(40, 12, 0);
  const chipX = snap(interpolate(chip.t, [0, 1], [180, 0]));
  // CTA
  const cta = enter(50, 14, 0);

  // Stripes
  const stripeT = (i: number) => clamp(ease((frame - (10 + i * 3) * mul) / (14 * mul)));
  const BORDER_Y = 1180;

  const bg = `linear-gradient(180deg, ${s.paper} 0%, ${s.paperDeep} 100%)`;
  const chipBg = s.deal.discountChipBg === "accent" ? s.accent : s.paper;
  const chipFg = s.deal.discountChipBg === "accent" ? "#ffffff" : s.ink;

  // ─────────────────────────────────────────────────────────────
  // ZARA — full-bleed-serif : produit centré, titre serif sous le
  // produit, prix discret, beaucoup d'air. Pas de bloc noir.
  // ─────────────────────────────────────────────────────────────
  if (s.deal.layout === "full-bleed-serif") {
    return (
      <AbsoluteFill style={{ background: bg }}>
        {/* Header — marque discrète + index sans dossard */}
        <div style={{
          position: "absolute", top: 110, left: 60, right: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: head.t, transform: `translate3d(0, ${head.y}px, 0)`, ...gpuLayer,
        }}>
          <span style={{
            fontFamily: s.fonts.body, fontWeight: 500,
            fontSize: 20, color: s.inkSoft, letterSpacing: 8,
            textTransform: "uppercase",
          }}>{brandUpper}</span>
          <span style={{
            fontFamily: s.fonts.kinetic, fontSize: 22,
            color: s.inkSoft, letterSpacing: 6,
          }}>{String(index + 1).padStart(2, "0")} — {String(total).padStart(2, "0")}</span>
        </div>

        {/* Produit centré, large */}
        <div style={{
          position: "absolute", top: 240, left: 0, right: 0, height: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: img.t, transform: `scale(${imgScale}) translateZ(0)`, ...gpuLayer,
        }}>
          <div style={{
            width: "90%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            filter: "drop-shadow(0 50px 36px rgba(0,0,0,0.18))",
            transform: `translate3d(${kenPanX}px, 0, 0) scale(${kenZoom})`,
            willChange: "transform", backfaceVisibility: "hidden",
          }}>
            <Img src={deal.imageUrl} style={{
              maxWidth: "100%", maxHeight: "100%",
              width: "auto", height: "auto", objectFit: "contain",
              mixBlendMode: "multiply",
            }} />
          </div>
        </div>

        {/* Titre serif sous le produit */}
        <div style={{
          position: "absolute", left: 80, right: 80, top: 1380,
          textAlign: "center",
          opacity: title.t, transform: `translate3d(0, ${title.y}px, 0)`, ...gpuLayer,
        }}>
          <div style={{
            fontFamily: s.fonts.body, fontSize: 18, fontWeight: 500,
            color: s.inkSoft, letterSpacing: 8,
            textTransform: "uppercase",
          }}>{deal.category}</div>
          <div style={{
            marginTop: 16,
            fontFamily: s.fonts.display, fontWeight: 500,
            fontSize: 64, color: s.ink, lineHeight: 1.1, letterSpacing: -0.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>{deal.title}</div>
        </div>

        {/* Bloc prix horizontal, fin */}
        <div style={{
          position: "absolute", left: 80, right: 80, bottom: 170,
          display: "flex", alignItems: "baseline", justifyContent: "center", gap: 40,
          opacity: price.t, transform: `translate3d(0, ${-price.y}px, 0)`, ...gpuLayer,
        }}>
          <div style={{
            fontFamily: s.fonts.display, fontWeight: 400,
            fontSize: s.deal.priceFontSize, color: s.ink,
            lineHeight: 0.9, letterSpacing: -3,
          }}>{fmtPrice(sale)}<span style={{ fontSize: s.deal.priceFontSize * 0.55 }}> €</span></div>
          {hasOrig && (
            <div style={{
              fontFamily: s.fonts.body, fontSize: 38, fontWeight: 400,
              color: s.inkSoft, textDecoration: "line-through",
            }}>{fmtPrice(orig)} €</div>
          )}
        </div>

        {/* CTA pied */}
        <div style={{
          position: "absolute", bottom: 70, left: 0, right: 0, textAlign: "center",
          opacity: cta.t,
          fontFamily: s.fonts.body, fontWeight: 500,
          fontSize: 22, color: s.inkSoft, letterSpacing: 10,
        }}>GOLDEALSCLUB.COM</div>
      </AbsoluteFill>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ADIDAS / NIKE — block-bottom & kinetic-card partagent une base :
  // bloc ink en bas avec le prix. Le toggle accent + ghost change.
  // ─────────────────────────────────────────────────────────────
  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Wordmark fantôme marque */}
      {s.deal.showGhostBrand && (
        <div style={{
          position: "absolute", top: 380, left: -120, right: -120,
          textAlign: "center",
          fontFamily: s.fonts.display, fontWeight: 900,
          fontSize: 420, lineHeight: 0.85, letterSpacing: -12,
          color: s.ink, opacity: ghostT * 0.07,
          transform: `translate3d(${ghostX}px, 0, 0) rotate(-8deg)`,
          whiteSpace: "nowrap", overflow: "hidden",
          textTransform: "uppercase",
          ...gpuLayer,
        }}>{brandUpper}</div>
      )}

      {/* Header marque + dossard */}
      <div style={{
        position: "absolute", top: 90, left: 60, right: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: head.t, transform: `translate3d(0, ${head.y}px, 0)`, ...gpuLayer,
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 72 }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{ height: 60, width: "auto", objectFit: "contain", filter: "brightness(0)" }} />
          ) : (
            <span style={{
              fontFamily: s.fonts.display, fontWeight: 900,
              fontSize: 52, color: s.ink, letterSpacing: -1,
              textTransform: "uppercase",
            }}>{brandUpper}</span>
          )}
        </div>
        {s.deal.showDossard && (
          <div style={{
            padding: "10px 22px",
            border: `3px solid ${s.ink}`,
            fontFamily: s.fonts.display, fontWeight: 900, fontSize: 36,
            color: s.ink, lineHeight: 1,
          }}>
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Produit */}
      <div style={{
        position: "absolute", top: 220, left: 0, right: 0, height: 900,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: img.t, transform: `scale(${imgScale}) translateZ(0)`, ...gpuLayer,
      }}>
        <div style={{
          width: "88%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: "drop-shadow(0 50px 36px rgba(0,0,0,0.22)) drop-shadow(0 8px 12px rgba(0,0,0,0.10))",
          transform: `translate3d(${kenPanX}px, 0, 0) scale(${kenZoom})`,
          willChange: "transform", backfaceVisibility: "hidden",
        }}>
          <Img src={deal.imageUrl} style={{
            maxWidth: "100%", maxHeight: "100%",
            width: "auto", height: "auto", objectFit: "contain",
            mixBlendMode: "multiply",
          }} />
        </div>
      </div>

      {/* 3-stripes frontière */}
      {s.deal.showStripes && [0, 1, 2].map((i) => {
        const t = stripeT(i);
        const w = snap(interpolate(t, [0, 1], [0, 1080]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: BORDER_Y - 30 + i * 10,
            left: 0, height: 4, width: w, background: s.ink,
            ...gpuLayer,
          }} />
        );
      })}

      {/* Bloc noir bas */}
      <div style={{
        position: "absolute", top: BORDER_Y, left: 0, right: 0, bottom: 0,
        background: s.ink,
        transform: `translate3d(0, ${block.y}px, 0)`,
        opacity: block.t, ...gpuLayer,
      }}>
        {/* Titre */}
        <div style={{
          position: "absolute", top: 50, left: 60, right: 60,
          opacity: title.t, transform: `translate3d(0, ${title.y}px, 0)`, ...gpuLayer,
        }}>
          <div style={{
            fontFamily: s.fonts.body, fontSize: 17, fontWeight: 700,
            color: s.paperSoft, letterSpacing: 6,
            textTransform: "uppercase",
          }}>{deal.category}</div>
          <div style={{
            marginTop: 12,
            fontFamily: s.fonts.display, fontWeight: 800,
            fontSize: 46, color: s.paper, lineHeight: 1.05, letterSpacing: -0.5,
            textTransform: s.deal.titleUppercase ? "uppercase" : "none",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>{deal.title}</div>
        </div>

        {/* Prix */}
        <div style={{
          position: "absolute", left: 60, right: 60, top: 250,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30,
        }}>
          <div style={{
            opacity: price.t, transform: `translate3d(${priceX}px, 0, 0)`, ...gpuLayer,
          }}>
            <div style={{
              fontFamily: s.fonts.body, fontSize: 16, fontWeight: 700,
              color: s.paperSoft, letterSpacing: 6,
              textTransform: "uppercase",
            }}>Prix membre</div>
            <div style={{
              marginTop: 8,
              fontFamily: s.fonts.display, fontWeight: 900,
              fontSize: s.deal.priceFontSize, color: s.paper,
              lineHeight: 0.85, letterSpacing: -8,
            }}>{fmtPrice(sale)}<span style={{ fontSize: s.deal.priceFontSize * 0.56, marginLeft: 8 }}>€</span></div>
          </div>

          {hasOrig && (
            <div style={{
              opacity: chip.t, transform: `translate3d(${chipX}px, 0, 0)`, ...gpuLayer,
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              gap: 18, paddingBottom: 24,
            }}>
              <div style={{
                fontFamily: s.fonts.body, fontSize: 30, fontWeight: 600,
                color: s.paperSoft, textDecoration: "line-through",
                textDecorationThickness: 2,
              }}>{fmtPrice(orig)} €</div>
              <div style={{
                background: chipBg, color: chipFg,
                padding: "18px 26px",
                fontFamily: s.fonts.display, fontWeight: 900,
                fontSize: 64, letterSpacing: -2, lineHeight: 1,
                border: `3px solid ${chipBg}`,
              }}>−{discount}%</div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{
          position: "absolute", bottom: 60, left: 60, right: 60,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: cta.t,
          fontFamily: s.fonts.body, fontWeight: 700,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontSize: 26, color: s.paper, letterSpacing: 4 }}>VOIR L'OFFRE</span>
            <span style={{ width: 60, height: 2, background: s.paper }} />
          </div>
          <span style={{
            fontFamily: s.fonts.kinetic, fontSize: 26,
            color: s.paperSoft, letterSpacing: 6,
          }}>GOLDEALSCLUB.COM</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
