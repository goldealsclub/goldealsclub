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
import { useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export interface QACheckpoint {
  frame: number;
  scene: string;
}

const FRAME_TOLERANCE = 2;

export const LayoutQA: React.FC<{ checkpoints: QACheckpoint[]; fonts: string[] }> = ({ checkpoints, fonts }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  useEffect(() => {
    const cp = checkpoints.find((c) => c.frame === frame);
    if (!cp || typeof document === "undefined") return;

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
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const text = (el.textContent ?? "").trim().slice(0, 70);
      const cs = getComputedStyle(el);
      const he = el as HTMLElement;

      if (r.left < -FRAME_TOLERANCE || r.top < -FRAME_TOLERANCE || r.right > width + FRAME_TOLERANCE || r.bottom > height + FRAME_TOLERANCE) {
        issues.push({ kind: "hors-cadre", text });
      }
      const clips = cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.textOverflow === "ellipsis";
      if (clips && he.scrollWidth > he.clientWidth + FRAME_TOLERANCE) issues.push({ kind: "coupe-largeur", text });
      if (clips && he.scrollHeight > he.clientHeight + FRAME_TOLERANCE) issues.push({ kind: "coupe-hauteur", text });
    });

    for (const family of fonts) {
      try {
        if (!document.fonts.check(`32px ${family}`)) issues.push({ kind: "police", text: family });
      } catch {
        issues.push({ kind: "police", text: family });
      }
    }

    console.log(`QA_LAYOUT ${JSON.stringify({ frame, scene: cp.scene, issues })}`);
  }, [frame, checkpoints, fonts, width, height]);

  return null;
};
