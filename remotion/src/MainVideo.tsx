import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

// Intro 2s (60f) + 5 deals × 4.3s (130f) + Outro 3.3s (100f) - 6 transitions × 20f = 750f = 25s
export const MainVideo: React.FC = () => {
  const t = 20;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111111" }}>
      <TransitionSeries>
        {/* Intro — SHORT 2s */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
        />

        {deals.map((deal, i) => (
          <>
            <TransitionSeries.Sequence key={`deal-${i}`} durationInFrames={130}>
              <DealScene deal={deal} index={i} />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
              key={`trans-${i}`}
              presentation={i % 2 === 0 ? slide({ direction: "from-left" }) : slide({ direction: "from-right" })}
              timing={springTiming({ config: { damping: 200 }, durationInFrames: t })}
            />
          </>
        ))}

        {/* Outro — 3.3s */}
        <TransitionSeries.Sequence durationInFrames={100}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
