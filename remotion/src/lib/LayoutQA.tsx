/**
 * Contrôle de mise en page pendant le rendu (n'affiche rien).
 *
 * Aux instants « posés » de chaque scène (animations d'entrée terminées,
 * avant la transition de sortie), mesure tous les éléments qui portent du texte :
 *   - hors-cadre       : texte qui dépasse du 1080×1920
 *   - coupe-largeur    : texte rogné horizontalement (overflow caché)
 *   - coupe-hauteur    : texte rogné verticalement (ex. titre tronqué à 3 lignes)
 *   - police           : police attendue non chargée (repli sur une police système)
 * Le résultat est écrit dans la console (« QA_LAYOUT {…} ») ; le script de
 * génération le récupère et bloque la publication en cas de défaut.
 */
import { useEffect, useRef } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

export interface QACheckpoint {
  frame: number;
  scene: string;
}

/**
 * Zone de sécurité des Reels / TikTok / Shorts (1080×1920) : en dehors, l'interface
 * des réseaux recouvre la vidéo (en-tête en haut, pseudo + légende + boutons en bas,
 * colonne d'icônes à droite). Prix, titre et marque doivent rester dedans.
 */
export const SAFE_ZONE = { top: 210, bottom: 1440, left: 50, right: 920 };

const FRAME_TOLERANCE = 2;

export const LayoutQA: React.FC<{ checkpoints: QACheckpoint[]; fonts: string[] }> = ({ checkpoints, fonts }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cp = checkpoints.find((c) => c.frame === frame);
    if (!cp || typeof document === "undefined") return;
    // Le moteur de rendu met parfois la composition en place après le premier
    // effet (conteneur 0×0 hors écran) : on attend que la vidéo ait sa vraie taille.
    const handle = delayRender(`Contrôle mise en page ${cp.scene}`);
    let tries = 0;
    let cancelled = false;
    const waitLayout = () => {
      if (cancelled) return;
      const b = rootRef.current?.getBoundingClientRect();
      if ((!b || b.width < 10 || b.top < -10000) && tries++ < 100) { requestAnimationFrame(waitLayout); return; }
      measure();
      continueRender(handle);
    };
    const measure = () => {

    const issues: Array<{ kind: string; text: string }> = [];
    const visible = (el: Element) => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) return false;
      }
      return true;
    };

    document.querySelectorAll("div, span, p, h1, h2, h3").forEach((el) => {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (!ownText || !visible(el)) return;
      const raw = el.getBoundingClientRect();
      if (raw.width === 0 || raw.height === 0) return;
      // Coordonnées dans la vidéo (1080×1920), quelle que soit la mise à l'échelle de la page.
      const box = rootRef.current?.getBoundingClientRect();
      const sx = box && box.width ? width / box.width : 1;
      const sy = box && box.height ? height / box.height : 1;
      const r = {
        left: (raw.left - (box?.left ?? 0)) * sx, right: (raw.right - (box?.left ?? 0)) * sx,
        top: (raw.top - (box?.top ?? 0)) * sy, bottom: (raw.bottom - (box?.top ?? 0)) * sy,
      };
      const text = (el.textContent ?? "").trim().slice(0, 70);
      const cs = getComputedStyle(el);
      const he = el as HTMLElement;

      const decor = !!el.closest("[data-qa-decor]");
      if (!decor && (r.left < -FRAME_TOLERANCE || r.top < -FRAME_TOLERANCE || r.right > width + FRAME_TOLERANCE || r.bottom > height + FRAME_TOLERANCE)) {
        issues.push({ kind: "hors-cadre", text: `${text} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]` });
      }
      // Texte important (prix, titre, marque…) sous l'interface des réseaux.
      // Seuls les textes décoratifs marqués data-qa-decor sont tolérés hors zone.
      if (!decor &&
          (r.top < SAFE_ZONE.top || r.bottom > SAFE_ZONE.bottom || r.left < SAFE_ZONE.left || r.right > SAFE_ZONE.right)) {
        issues.push({ kind: "zone-reseaux", text: `${text} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]` });
      }
      // Texte rogné par un parent qui masque le débordement (ex. « À DEMAIN » sans le point).
      for (let p = el.parentElement; p && !decor; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.overflow !== "hidden" && pcs.overflowX !== "hidden" && pcs.overflow !== "clip") continue;
        const pr = p.getBoundingClientRect();
        if (raw.left < pr.left - FRAME_TOLERANCE || raw.right > pr.right + FRAME_TOLERANCE) {
          issues.push({ kind: "coupe-largeur", text: `${text} (masqué par le cadre parent)` });
        }
        break;
      }
      // Interlignage < 1 dans un cadre qui masque le débordement : le haut ou le bas
      // des lettres/chiffres est rogné (ex. « 85,05 » dont les 5 sont coupés).
      if (!decor) {
        for (let p: Element | null = el; p; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          if (pcs.overflow === "visible" && pcs.overflowY === "visible") continue;
          const lh = parseFloat(cs.lineHeight);
          if (!Number.isNaN(lh) && lh < parseFloat(cs.fontSize) * 0.98) issues.push({ kind: "glyphes-rognes", text });
          break;
        }
      }
      const clips = cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.textOverflow === "ellipsis";
      if (!decor && clips && he.scrollWidth > he.clientWidth + FRAME_TOLERANCE) issues.push({ kind: "coupe-largeur", text });
      // Une vraie ligne masquée dépasse d'au moins une demi-ligne ; en dessous, ce sont
      // les jambages des lettres avec un interlignage serré (faux positif).
      const lineSlack = Math.max(FRAME_TOLERANCE, parseFloat(cs.fontSize) * 0.5);
      if (clips && he.scrollHeight > he.clientHeight + lineSlack) issues.push({ kind: "coupe-hauteur", text });
    });

    for (const family of fonts) {
      try {
        if (!document.fonts.check(`32px ${family}`)) issues.push({ kind: "police", text: family });
      } catch {
        issues.push({ kind: "police", text: family });
      }
    }

    console.log(`QA_LAYOUT ${JSON.stringify({ frame, scene: cp.scene, issues })}`);
    };
    requestAnimationFrame(waitLayout);
    return () => { cancelled = true; continueRender(handle); };
  }, [frame, checkpoints, fonts, width, height]);


  // Repère invisible couvrant toute la vidéo, sert d'origine aux mesures.
  return <div ref={rootRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
};
