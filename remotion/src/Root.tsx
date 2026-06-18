import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { IntroScene } from "./scenes/IntroScene";
import { DealScene } from "./scenes/DealScene";
import { OutroScene } from "./scenes/OutroScene";
import { deals } from "./data";

// Main : 80 + 5*130 + 110 - 6*16 = 744 frames @ 30fps ≈ 24.8s
export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={744}
      fps={30}
      width={1080}
      height={1920}
    />
    {/* ── QA solo compositions : utilisées par scripts/qa-frames.mjs ── */}
    <Composition
      id="qa-intro"
      component={IntroScene}
      durationInFrames={80}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="qa-deal"
      component={DealScene}
      durationInFrames={130}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        deal: deals[0],
        index: 0,
        total: deals.length || 5,
      }}
    />
    <Composition
      id="qa-outro"
      component={OutroScene}
      durationInFrames={110}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
