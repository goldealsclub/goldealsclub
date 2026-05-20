import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

// Premium cross-fade easing — long, smooth, editorial pacing
const TRANSITION_FRAMES = 35;
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const premiumFade = () =>
  fade({ enterStyle: { opacity: 0 }, exitStyle: { opacity: 0 } });

const premiumTiming = linearTiming({
  durationInFrames: TRANSITION_FRAMES,
  easing: easeInOutCubic,
});

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#eaecf0" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <DealScene deal={deals[0]} index={0} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <DealScene deal={deals[1]} index={1} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <DealScene deal={deals[2]} index={2} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <DealScene deal={deals[3]} index={3} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <DealScene deal={deals[4]} index={4} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={premiumFade()} timing={premiumTiming} />

        <TransitionSeries.Sequence durationInFrames={130}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
