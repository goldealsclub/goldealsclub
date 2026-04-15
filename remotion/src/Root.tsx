import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 60 + 5×130 + 100 - 6×20 = 750 frames = 25s @ 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={750}
    fps={30}
    width={1080}
    height={1920}
  />
);
