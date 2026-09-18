import { Composition } from "remotion";
import { MainVideo, computeTotalFrames, SCENE_DURATIONS } from "./MainVideo";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";
import { StyleProvider } from "./lib/style-context";
import { STYLES, type StyleId } from "./lib/styles";

const STYLE_IDS: StyleId[] = ["adidas", "zara", "nike"];
const QA_STRESS_DEAL = {
  ...deals[0],
  title: "Chaussures de football enfant adidas F50 Club FG/AG édition spéciale",
  brand: "New Balance Athletics",
  salePrice: 1299.99,
  originalPrice: 1599.99,
};

// Wrappers QA solo : injectent le StyleProvider pour les scènes isolées
const wrapWithStyle = <P extends object>(
  Component: React.FC<P>,
  styleId: StyleId,
): React.FC<P> => (props) => (
  <StyleProvider styleId={styleId}>
    <Component {...props} />
  </StyleProvider>
);

export const RemotionRoot = () => (
  <>
    {/* ── Composition principale (rétro-compat, default = adidas) ── */}
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={computeTotalFrames("adidas")}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ styleId: "adidas" as StyleId }}
    />

    {/* ── Une compo par direction artistique ── */}
    {STYLE_IDS.map((id) => (
      <Composition
        key={id}
        id={`main-${id}`}
        component={MainVideo}
        durationInFrames={computeTotalFrames(id)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ styleId: id }}
      />
    ))}

    {/* ── QA solo : 3 scènes × 3 styles = 9 compositions ─────────── */}
    {STYLE_IDS.map((id) => (
      <Composition
        key={`qa-intro-${id}`}
        id={`qa-intro-${id}`}
        component={wrapWithStyle(IntroScene, id)}
        durationInFrames={SCENE_DURATIONS.intro}
        fps={30}
        width={1080}
        height={1920}
      />
    ))}
    {STYLE_IDS.map((id) => (
      <Composition
        key={`qa-deal-${id}`}
        id={`qa-deal-${id}`}
        component={wrapWithStyle(DealScene, id)}
        durationInFrames={SCENE_DURATIONS.deal}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          deal: QA_STRESS_DEAL,
          index: 0,
          total: deals.length || 5,
        }}
      />
    ))}
    {STYLE_IDS.map((id) => (
      <Composition
        key={`qa-outro-${id}`}
        id={`qa-outro-${id}`}
        component={wrapWithStyle(OutroScene, id)}
        durationInFrames={SCENE_DURATIONS.outro}
        fps={30}
        width={1080}
        height={1920}
      />
    ))}

    {/* ── Alias QA legacy (utilisent le style par défaut) ────────── */}
    <Composition
      id="qa-intro"
      component={wrapWithStyle(IntroScene, "adidas")}
      durationInFrames={SCENE_DURATIONS.intro}
      fps={30} width={1080} height={1920}
    />
    <Composition
      id="qa-deal"
      component={wrapWithStyle(DealScene, "adidas")}
      durationInFrames={SCENE_DURATIONS.deal}
      fps={30} width={1080} height={1920}
      defaultProps={{ deal: QA_STRESS_DEAL, index: 0, total: deals.length || 5 }}
    />
    <Composition
      id="qa-outro"
      component={wrapWithStyle(OutroScene, "adidas")}
      durationInFrames={SCENE_DURATIONS.outro}
      fps={30} width={1080} height={1920}
    />

    {/* Export pour debug : la liste des styles disponibles */}
    {Object.values(STYLES).length ? null : null}
  </>
);
