import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame, type FormPhase } from "@/components/landing/Phone";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { LANDING_COPY } from "@/components/landing/copy";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";

export function Leads() {
  const frame = useCurrentFrame();
  const form: FormPhase = frame < 20 ? 1 : frame < 75 ? 2 : 3; // shown, filled, sent
  const banner = progress(frame, 85, 15);
  return (
    <AbsoluteFill style={{ background: "#12161F", padding: 96, gap: 64 }}>
      <div style={{ height: 220 }}>{linesFor("leads").map((l) => <Caption key={l.text} line={l} ink="#EEF1F4" size={84} />)}</div>
      {/* Same stage as Tap: 888 = 1080 frame width minus 96 px padding each side; phone drawn at 300 px, scaled 1.9x. */}
      <div style={{ position: "relative", width: 888, height: 1300 }}>
        <div style={{ position: "absolute", left: 159, top: 0, transformOrigin: "top left", transform: "scale(1.9)" }}>
          <PhoneFrame className="relative">
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#EEF1F4" }}>
              <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" form={form} />
            </div>
          </PhoneFrame>
        </div>
        {/* The owner's notification; red is the status colour. */}
        <div style={{ position: "absolute", left: 129, width: 630, top: 20, transform: `translateY(${(1 - banner) * -160}px)`, opacity: banner, background: "#EEF1F4", border: "1.5px solid #D0312D", padding: "28px 32px", fontFamily: "Archivo" }}>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: "#C42A26" }}>{LANDING_COPY.newLead}</p>
          <p style={{ margin: "8px 0 0", fontSize: 34, color: "#12161F" }}>{LANDING_COPY.leadDemo}</p>
        </div>
      </div>
    </AbsoluteFill>
  );
}
