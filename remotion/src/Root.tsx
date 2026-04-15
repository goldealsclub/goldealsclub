import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 60 + 5*130 + 120 - 6*18 = 60+650+120-108 = 722 frames ≈ 24s
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={722}
    fps={30}
    width={1080}
    height={1920}
  />
);
