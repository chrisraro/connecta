import type { JSX } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BEATS, TOTAL_FRAMES, type BeatId } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Tap } from "./scenes/Tap";
import { Profile } from "./scenes/Profile";
import { Leads } from "./scenes/Leads";
import { Personas } from "./scenes/Personas";
import { Cta } from "./scenes/Cta";
import { MatchCut } from "./fx/MatchCutLot";

const SCENES: Record<BeatId, () => JSX.Element> = { hook: Hook, tap: Tap, profile: Profile, leads: Leads, personas: Personas, cta: Cta };

/** The licensed track's file name in video/public/, once chosen; null renders silent. */
export const MUSIC: string | null = null;

const FADE = 60; // music fades out over the last 2 s

export function Showcase() {
  return (
    <AbsoluteFill>
      {BEATS.map((b) => {
        const Scene = SCENES[b.id];
        return (
          <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
            <Scene />
          </Sequence>
        );
      })}
      {/* The chamfered lot carries each act's key shape across the cut; the scenes switch underneath at the window's midpoint. */}
      <MatchCut />
      {MUSIC && <Audio src={staticFile(MUSIC)} volume={(f) => 0.6 * Math.min(1, (TOTAL_FRAMES - f) / FADE)} />}
    </AbsoluteFill>
  );
}
