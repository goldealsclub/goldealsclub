import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 80 + 5*130 + 120 - 6*18 = 80+650+120-108 = 742
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={742}
    fps={30}
    width={1080}
    height={1920}
  />
);
