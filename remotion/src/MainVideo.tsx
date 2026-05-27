import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
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
    <AbsoluteFill style={{ backgroundColor: "#f5f3ee" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <IntroScene />
        </TransitionSeries.Sequence>

        {deals.map((deal, i) => (
          <TransitionSeries.Sequence key={i} durationInFrames={140}>
            <DealScene deal={deal} index={i} total={TOTAL} />
          </TransitionSeries.Sequence>
        )).flatMap((seq, i, arr) =>
          i < arr.length - 1
            ? [seq, <TransitionSeries.Transition key={`t-${i}`} presentation={premiumFade()} timing={premiumTiming} />]
            : [seq]
        )}

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={130}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
