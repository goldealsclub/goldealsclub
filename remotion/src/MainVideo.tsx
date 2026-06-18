import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Fragment } from "react";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

// Premium cross-fade éditorial — lent et doux
const TRANSITION_FRAMES = 35;
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const premiumFade = () =>
  fade({ enterStyle: { opacity: 0 }, exitStyle: { opacity: 0 } });

const premiumTiming = linearTiming({
  durationInFrames: TRANSITION_FRAMES,
  easing: easeInOutCubic,
});

const TOTAL = deals.length;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f1ea" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        {deals.map((deal, i) => (
          <Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={140}>
              <DealScene deal={deal} index={i} total={TOTAL} />
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />
          </Fragment>
        ))}

        <TransitionSeries.Sequence durationInFrames={130}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
