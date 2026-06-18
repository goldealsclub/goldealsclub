/**
 * QA visuelle — grille StylePreview (Adidas / Zara / Nike).
 *
 * Page volontairement nue, sans header / overlay / police custom autre que
 * celle déjà chargée par l'app, pour produire des screenshots déterministes
 * consommés par `scripts/qa-style-preview.mjs`.
 *
 * Layout : chaque carte est rendue dans un conteneur de largeur fixe via
 * data-testid="style-card-<id>", ce qui permet à Playwright de capturer
 * proprement chaque carte indépendamment de la viewport globale.
 *
 * Deux scènes :
 *  - desktop (grille 3 colonnes, cartes 280px)
 *  - mobile  (grille 3 colonnes serrée, cartes 110px → vérifie la
 *    cohérence quand l'admin ouvre /admin/video sur un petit écran)
 *
 * Le rendu de chaque carte ne dépend d'AUCUNE donnée réseau ni de l'heure
 * système, donc deux runs successifs doivent produire le même pixel exact.
 */
import { useState } from "react";
import { StylePreview } from "@/components/admin/StylePreview";
import type { BgPreset } from "@/pages/AdminVideoPage";

const STYLES: BgPreset[] = ["adidas", "zara", "nike"];

// (composant Scene par-carte retiré : on capture la grille naturelle telle
// qu'elle s'affiche dans /admin/video — voir SceneGrid ci-dessous.)

/**
 * En réalité on a besoin de capturer la grille NATURELLE (3 cartes côte à
 * côte) telle qu'elle s'affiche dans /admin/video, pas une carte isolée
 * répétée. On rend donc une seule grille par scène avec la largeur cible.
 */
const SceneGrid: React.FC<{
  label: string;
  width: number;
  testid: string;
}> = ({ label, width, testid }) => {
  const [active, setActive] = useState<BgPreset>("adidas");
  return (
    <section
      data-testid={testid}
      className="border-b border-border bg-background p-6"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {label} — {width}px
      </h2>
      <div style={{ width }} data-testid={`${testid}-grid`}>
        <StylePreview
          value={active}
          onChange={setActive}
          disabled={false}
        />
      </div>
    </section>
  );
};

const AdminStylePreviewQAPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-6">
        <h1 className="text-xl font-bold">Style Preview — visual QA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Référence visuelle pour <code>scripts/qa-style-preview.mjs</code>.
          Toute modification de StylePreview doit conserver la cohérence
          de ces grilles sur desktop et mobile.
        </p>
      </header>
      <SceneGrid label="Desktop grid" width={900} testid="scene-desktop" />
      <SceneGrid label="Tablet grid" width={600} testid="scene-tablet" />
      <SceneGrid label="Mobile grid" width={360} testid="scene-mobile" />
    </main>
  );
};

export default AdminStylePreviewQAPage;
