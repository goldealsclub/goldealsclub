import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

export const MainVideo: React.FC = () => {
  const t = 18;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111111" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={60}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={130}>
          <DealScene deal={deals[0]} index={0} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={130}>
          <DealScene deal={deals[1]} index={1} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={130}>
          <DealScene deal={deals[2]} index={2} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={130}>
          <DealScene deal={deals[3]} index={3} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={130}>
          <DealScene deal={deals[4]} index={4} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
