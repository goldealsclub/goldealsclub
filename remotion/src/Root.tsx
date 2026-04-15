import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 30fps × 28s = 840 frames
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={840}
    fps={30}
    width={1080}
    height={1920}
  />
);
