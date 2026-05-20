import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 90 + 5*140 + 130 - 6*35 = 90+700+130-210 = 710
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={710}
    fps={30}
    width={1080}
    height={1920}
  />
);
