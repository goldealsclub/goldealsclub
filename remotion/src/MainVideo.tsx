import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Fragment } from "react";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

// Direction Adidas — geometric & graphic.
// Transitions FERMES : wipe linéaire (pas de fade lent éditorial).
// Coupes nettes = signature 3-stripes appliquée au timeline lui-même.
const TRANSITION_FRAMES = 16;
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

const wipeRight = () => wipe({ direction: "from-left" });
const wipeUp    = () => wipe({ direction: "from-bottom" });
const slideLeft = () => slide({ direction: "from-right" });

const tightTiming = linearTiming({
  durationInFrames: TRANSITION_FRAMES,
  easing: easeOutQuart,
});

const TOTAL = deals.length;

// Cadence resserrée : intro 80, deal 130, outro 110.
// Total: 80 + 5*130 + 110 - 6*16 = 744 frames @ 30fps ≈ 24.8s
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f1ea" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={80}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipeUp()} timing={tightTiming} />

        {deals.map((deal, i) => (
          <Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={130}>
              <DealScene deal={deal} index={i} total={TOTAL} />
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition
              presentation={i % 2 === 0 ? slideLeft() : wipeRight()}
              timing={tightTiming}
            />
          </Fragment>
        ))}

        <TransitionSeries.Sequence durationInFrames={110}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
