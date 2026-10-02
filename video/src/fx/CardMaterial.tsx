import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../motion";

const SWEEP = 24; // frames for the one specular pass

/** A card with a 3 px darker camera-facing edge and one hard-edged specular band sweeping across from `at`. */
export function CardMaterial({ at, edge, radius = 0, children }: { at: number; edge: string; radius?: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const p = progress(frame, at, SWEEP);
  const sweeping = frame >= at && p < 1;
  return (
    <div style={{ position: "relative", borderRadius: radius }}>
      {children}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: `inset -3px -3px 0 0 ${edge}`, pointerEvents: "none", overflow: "hidden" }}>
        {sweeping && <div style={{ position: "absolute", top: "-10%", bottom: "-10%", left: `${-35 + p * 150}%`, width: "18%", background: "rgba(255,255,255,0.06)", transform: "skewX(-20deg)" }} />}
      </div>
    </div>
  );
}
