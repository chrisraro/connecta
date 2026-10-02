import type { JSX } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BEATS, TOTAL_FRAMES, type BeatId } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Tap } from "./scenes/Tap";
import { Profile } from "./scenes/Profile";
import { Leads } from "./scenes/Leads";
import { Personas } from "./scenes/Personas";
import { Cta } from "./scenes/Cta";
import { LineWipe } from "./transitions/LineWipe";

const SCENES: Record<BeatId, () => JSX.Element> = { hook: Hook, tap: Tap, profile: Profile, leads: Leads, personas: Personas, cta: Cta };

/** The licensed track's file name in video/public/, once chosen; null renders silent. */
export const MUSIC: string | null = null;

const ACT_GROUND: Record<BeatId, string> = { hook: "#12161F", tap: "#EEF1F4", profile: "#EEF1F4", leads: "#12161F", personas: "#EEF1F4", cta: "#2B3F8F" };
const LIGHT = "#EEF1F4";
const RULE_ON_LIGHT = "#2B3F8F";

const FADE = 60; // music fades out over the last 2 s

export function Showcase() {
  return (
    <AbsoluteFill>
      {BEATS.map((b, i) => {
        const next = BEATS[i + 1];
        const ground = next ? ACT_GROUND[next.id] : null;
        const Scene = SCENES[b.id];
        return (
          <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
            <Scene />
            {ground && <LineWipe at={b.frames - 15} ground={ground} color={ground === LIGHT ? RULE_ON_LIGHT : LIGHT} />}
          </Sequence>
        );
      })}
      {MUSIC && <Audio src={staticFile(MUSIC)} volume={(f) => 0.6 * Math.min(1, (TOTAL_FRAMES - f) / FADE)} />}
    </AbsoluteFill>
  );
}
