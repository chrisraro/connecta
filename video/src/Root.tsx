import "./style.css";
import { Composition, continueRender, delayRender } from "remotion";
import { Showcase } from "./Showcase";

// Hold rendering until the webfonts are ready, so no frame uses a fallback face.
const fonts = delayRender("fonts");
document.fonts.ready.then(() => continueRender(fonts));

export function RemotionRoot() {
  return <Composition id="Showcase" component={Showcase} width={1080} height={1920} fps={30} durationInFrames={1080} />;
}
