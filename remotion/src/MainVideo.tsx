import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { Fragment } from "react";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";
import { StyleProvider } from "./lib/style-context";
import { DEFAULT_STYLE_ID, getStyle, type StyleId } from "./lib/styles";

interface MainVideoProps {
  styleId?: StyleId;
}

const pickTransition = (kind: "wipe" | "fade" | "slide", i: number) => {
  switch (kind) {
    case "fade":  return fade({ enterStyle: { opacity: 0 }, exitStyle: { opacity: 0 } });
    case "slide": return slide({ direction: i % 2 === 0 ? "from-right" : "from-left" });
    case "wipe":
    default:      return i % 2 === 0 ? wipe({ direction: "from-left" }) : wipe({ direction: "from-bottom" });
  }
};

const TOTAL = deals.length;

// Durées par scène (inchangées) — le total est ajusté par durationInFrames
// dans Root.tsx en fonction de transitionFrames de chaque style.
const INTRO_FRAMES = 80;
const DEAL_FRAMES  = 130;
const OUTRO_FRAMES = 110;

export const MainVideo: React.FC<MainVideoProps> = ({ styleId }) => {
  const s = getStyle(styleId);
  const timing = linearTiming({
    durationInFrames: s.motion.transitionFrames,
    easing: s.motion.easing,
  });

  return (
    <StyleProvider styleId={styleId ?? DEFAULT_STYLE_ID}>
      <AbsoluteFill style={{ backgroundColor: s.paper }}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={INTRO_FRAMES}>
            <IntroScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={pickTransition(s.motion.transitionKind, 0)} timing={timing} />

          {deals.map((deal, i) => (
            <Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={DEAL_FRAMES}>
                <DealScene deal={deal} index={i} total={TOTAL} />
              </TransitionSeries.Sequence>
              <TransitionSeries.Transition
                presentation={pickTransition(s.motion.transitionKind, i + 1)}
                timing={timing}
              />
            </Fragment>
          ))}

          <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
            <OutroScene />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>
    </StyleProvider>
  );
};

export const SCENE_DURATIONS = {
  intro: INTRO_FRAMES,
  deal: DEAL_FRAMES,
  outro: OUTRO_FRAMES,
};

/**
 * Total frames pour un style donné.
 * Formule : intro + N*deal + outro - (N+1)*transitionFrames
 */
export const computeTotalFrames = (styleId: StyleId): number => {
  const s = getStyle(styleId);
  const transitions = TOTAL + 1;
  return INTRO_FRAMES + TOTAL * DEAL_FRAMES + OUTRO_FRAMES - transitions * s.motion.transitionFrames;
};
