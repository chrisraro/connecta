import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { CardMock } from "@/components/landing/CardMock";
import { SHOWCASE } from "@/components/landing/SkinShowcase";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { cardSkin } from "@/lib/cardSkins";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { Annotation } from "../fx/Annotation";
import { CameraPush } from "../fx/CameraPush";
import { CardMaterial } from "../fx/CardMaterial";
import { KineticCaption } from "../fx/KineticCaption";
import { Tilt3D } from "../fx/Tilt3D";
import type { Pose } from "../fx/pose";

const EACH = 60; // 2 s per persona; 4 personas fill the 8 s beat
const OVERLAP = 24; // a card stays under the next one while that one slides in
const REST: Pose = { rx: 0, ry: 0, z: 0, x: 0, y: 0 };
// The first card was already settling when the match-cut lot lands on it, so the lot traces a card that is in place.
const FIRST_FROM: Pose = { rx: 8, ry: -10, z: -60, x: 0, y: 40 };
const FIRST_START = -20; // 20 frames in at the cut, so only ~4% of the move is left by the time the lot is held on the card
// Every later card slides in over the one before it from the right, turned a little toward us.
const NEXT_FROM: Pose = { rx: 6, ry: -26, z: -120, x: 520, y: 30 };
const INK = "#12161F";
const LINE = "#2B3F8F";

function PersonaCard({ index, last }: { index: number; last: boolean }) {
  const frame = useCurrentFrame();
  const { skin, persona } = SHOWCASE[index];
  const p = PERSONAS[persona];
  // The skin name leaves quickly when the next card starts to arrive, so two labels never share the row.
  const label = last ? 1 : 1 - progress(frame, EACH, 9);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 400 }}>
      <Tilt3D from={index === 0 ? FIRST_FROM : NEXT_FROM} to={REST} start={index === 0 ? FIRST_START : 0}>
        {/* Caption owns the top 300 px; the card and its skin label sit below it. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <CardMaterial at={14} edge="rgba(10, 12, 16, 0.32)" radius={12}>
            <CardMock className="w-[760px] [&>[data-digital-card]]:max-w-none">
              <DigitalBusinessCard fullName={p.name} title={p.title} company={p.company} phone="" email="" avatarUrl={p.photo} config={{ skin }} orientation="portrait" qrValue="https://connectaph.vercel.app" />
            </CardMock>
          </CardMaterial>
          <p style={{ fontFamily: "Archivo", fontSize: 44, fontWeight: 700, color: INK, margin: 0, opacity: label }}>{cardSkin(skin).label}</p>
        </div>
      </Tilt3D>
      {/* The real size of a business card, drawn once on the first card: a dimension line over its top edge. */}
      {index === 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - progress(frame, 48, 9) }}>
          <Annotation x1={160} y1={366} x2={920} y2={366} label="85.6 × 54 mm" at={26} color={LINE} />
        </div>
      )}
    </AbsoluteFill>
  );
}

export function Personas() {
  return (
    <AbsoluteFill style={{ background: "#EEF1F4" }}>
      <CameraPush frames={240}>
        {SHOWCASE.map(({ skin }, i) => (
          <Sequence key={skin} from={i * EACH} durationInFrames={i === SHOWCASE.length - 1 ? EACH : EACH + OVERLAP}>
            <PersonaCard index={i} last={i === SHOWCASE.length - 1} />
          </Sequence>
        ))}
        <AbsoluteFill style={{ padding: 96, justifyContent: "flex-start" }}>{linesFor("personas").map((l) => <KineticCaption key={l.text} line={l} ink={INK} size={88} />)}</AbsoluteFill>
      </CameraPush>
    </AbsoluteFill>
  );
}
