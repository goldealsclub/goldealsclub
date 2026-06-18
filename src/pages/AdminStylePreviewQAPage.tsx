/**
 * QA visuelle — grille StylePreview (Adidas / Zara / Nike).
 *
 * Page volontairement nue pour produire des screenshots déterministes
 * consommés par `scripts/qa-style-preview.mjs`. Un seul preset de grille
 * est rendu à la fois via `?scene=desktop|tablet|mobile`, ce qui évite
 * tout overflow horizontal (un layout 900 sur une viewport 390 ferait
 * échouer la capture par clip).
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StylePreview } from "@/components/admin/StylePreview";
import type { BgPreset } from "@/pages/AdminVideoPage";

const SCENES: Record<string, { label: string; width: number }> = {
  desktop: { label: "Desktop grid", width: 900 },
  tablet:  { label: "Tablet grid",  width: 600 },
  mobile:  { label: "Mobile grid",  width: 360 },
};

const SceneGrid: React.FC<{ id: string; label: string; width: number }> = ({
  id, label, width,
}) => {
  const [active, setActive] = useState<BgPreset>("adidas");
  return (
    <section
      data-testid={`scene-${id}`}
      className="bg-background p-6"
      style={{ fontFamily: "Inter, system-ui, sans-serif", width: width + 48 }}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {label} — {width}px
      </h2>
      <div style={{ width }} data-testid={`scene-${id}-grid`}>
        <StylePreview value={active} onChange={setActive} disabled={false} />
      </div>
    </section>
  );
};

const AdminStylePreviewQAPage: React.FC = () => {
  const [params] = useSearchParams();
  const sceneParam = params.get("scene");

  const visible = useMemo(() => {
    if (sceneParam && SCENES[sceneParam]) return [sceneParam];
    return Object.keys(SCENES);
  }, [sceneParam]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {!sceneParam && (
        <header className="border-b border-border p-6">
          <h1 className="text-xl font-bold">Style Preview — visual QA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Référence visuelle pour <code>scripts/qa-style-preview.mjs</code>.
            Le script visite cette page avec <code>?scene=desktop|tablet|mobile</code>
            pour isoler chaque grille.
          </p>
        </header>
      )}
      {visible.map((id) => {
        const s = SCENES[id];
        return <SceneGrid key={id} id={id} label={s.label} width={s.width} />;
      })}
    </main>
  );
};

export default AdminStylePreviewQAPage;
