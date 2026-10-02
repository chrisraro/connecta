import "./style.css";
import { Composition, cancelRender, continueRender, delayRender } from "remotion";
import { Showcase } from "./Showcase";

// Hold rendering until the webfonts are ready, so no frame uses a fallback face.
const fonts = delayRender("fonts", { timeoutInMilliseconds: 60000 });
// The stylesheet (and its @font-face rules) must be in before load() can find the faces.
const stylesLoaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => window.addEventListener("load", () => r()));
stylesLoaded.then(() => Promise.all(["700 96px Archivo", "400 32px Archivo", "600 32px Archivo", "400 24px 'JetBrains Mono'", "500 32px 'JetBrains Mono'"].map((f) => document.fonts.load(f)))).then((loaded) => { if (loaded.some((l) => l.length === 0)) throw new Error("webfont failed to load"); continueRender(fonts); }).catch((e) => cancelRender(e));

export function RemotionRoot() {
  return <Composition id="Showcase" component={Showcase} width={1080} height={1920} fps={30} durationInFrames={1080} />;
}
