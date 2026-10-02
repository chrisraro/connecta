# Connecta PH Showcase Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 36-second 9:16 Remotion video in `video/` that sells a free Connecta profile, built from the app's real components.

**Architecture:** A standalone Remotion project in `video/` (own `package.json`, own `node_modules`) that imports the website's components through the `@/` alias. One timeline file and one copy file drive six scenes and three transitions; scenes never hard-code times or text. The website build ignores `video/`.

**Tech Stack:** Remotion 4.0.532 (`remotion`, `@remotion/cli`, `@remotion/tailwind-v4`), React 19.2.3, Tailwind v4, TypeScript 5, Vitest (root), ffmpeg/ffprobe 8.1 (installed via winget).

Spec: `docs/superpowers/specs/2026-10-02-showcase-video-design.md`.

## Global Constraints

- Format: 1080 × 1920, 30 fps, total 36 s ± 1 s (1080 frames).
- Story beats (seconds): Hook 0–3, Tap 3–8, Profile 8–16, Leads 16–22, Personas 22–30, CTA 30–36.
- CTA text: "Create your free profile" and "connectaph.vercel.app". No card price. No roadmap items.
- On-screen text: at most 7 words per line; each line on screen at least 1.5 s (45 frames).
- Red (`#D0312D` / `#FF5A52`) only for the point mark and the "New lead" status.
- Not allowed: glows, blurs, emoji, invented numbers, stock photos of people.
- Motion: springs with damping ≥ 200 (no visible overshoot); no move shorter than 9 frames (300 ms).
- Any QR in the video encodes `https://connectaph.vercel.app`.
- `video/out/` and `video/node_modules/` are git-ignored; renders are never committed.
- The website build must not see `video/`: excluded from the root `tsconfig.json`.

## Workflow (every task)

- The whole video is one Jev build item: run the Jev intake once before Task 1 (route, ready, risk),
  and the Jev done gate (`jev_check`, full true/false criteria) in Task 7.
- ECC gates: Gate 1 is approval of this plan. Each task commits locally. Gate 2 (owner
  confirmation) comes before `git push`, in Task 7, because pushing `rename/connecta` deploys.
- Model routing: implement Tasks 1–6 with Sonnet subagents (`model: "sonnet"`), one fresh
  subagent per task, brief = the task text + Global Constraints only. Run the probe check
  (Task 7, Step 3) with a Haiku subagent. The main session reviews between tasks.
- Verify visuals with stills (`npx remotion still`), viewed as images. Render the full MP4 only in Task 7.

## File Structure

| Path | Responsibility |
|---|---|
| `video/package.json` | Remotion deps and scripts |
| `video/tsconfig.json` | TS config with the `@/*` → `../*` alias |
| `video/remotion.config.ts` | Webpack: Tailwind v4, `@/` alias, single React, `next/image` stand-in |
| `video/src/index.ts` | `registerRoot` |
| `video/src/Root.tsx` | Registers the `Showcase` composition; waits for fonts |
| `video/src/style.css` | Imports the site's `globals.css`, Tailwind sources, font variables |
| `video/src/shims/next-image.tsx` | Plain `<img>` stand-in for `next/image` |
| `video/src/timeline.ts` (+ `.test.ts`) | Beat names, start frames, lengths |
| `video/src/copy.ts` (+ `.test.ts`) | Every on-screen line, with its beat and timing |
| `video/src/motion.ts` (+ `.test.ts`) | Pure progress maths for transitions |
| `video/src/transitions/LineWipe.tsx` | Rule sweeps across, covers the outgoing scene |
| `video/src/transitions/LotDraw.tsx` | Chamfered lot outline draws closed |
| `video/src/transitions/PointSnap.tsx` | Red point pops in |
| `video/src/Caption.tsx` | Renders a copy line in the house type style |
| `video/src/scenes/{Hook,Tap,Profile,Leads,Personas,Cta}.tsx` | One scene each |
| `video/src/Showcase.tsx` | Assembles scenes on the timeline, optional music |
| `video/scripts/probe.mjs` | ffprobe check of the final MP4 |
| `components/ui/digital-business-card.tsx` | Modify: optional `qrValue` prop |
| `components/ui/digital-business-card.test.tsx` | Test for `qrValue` |
| `tsconfig.json`, `.gitignore` | Modify: exclude/ignore `video/` artefacts |

---

### Task 1: Scaffold the Remotion project and prove the real card renders

**Files:**
- Create: `video/package.json`, `video/tsconfig.json`, `video/remotion.config.ts`, `video/src/index.ts`, `video/src/Root.tsx`, `video/src/style.css`, `video/src/shims/next-image.tsx`, `video/src/Showcase.tsx`
- Modify: `tsconfig.json` (exclude), `.gitignore`

**Interfaces:**
- Produces: composition id `"Showcase"`, 1080 × 1920, 30 fps, 1080 frames; `Showcase` component in `video/src/Showcase.tsx` (replaced in Task 6).

- [ ] **Step 1: Keep `video/` out of the website build**

In `tsconfig.json` change `"exclude": ["node_modules"]` to:

```json
  "exclude": ["node_modules", "video"]
```

Append to `.gitignore`:

```
# Remotion showcase video
/video/node_modules/
/video/out/
```

- [ ] **Step 2: Create `video/package.json`**

```json
{
  "name": "connecta-showcase-video",
  "private": true,
  "type": "module",
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts Showcase out/connecta-showcase-9x16.mp4 --codec=h264",
    "probe": "node scripts/probe.mjs out/connecta-showcase-9x16.mp4"
  },
  "dependencies": {
    "@remotion/cli": "4.0.532",
    "@remotion/tailwind-v4": "4.0.532",
    "remotion": "4.0.532",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "lucide-react": "^0.563.0",
    "qrcode.react": "^4.2.0",
    "tailwindcss": "^4",
    "tw-animate-css": "^1"
  },
  "devDependencies": {
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

Run: `cd video && npm install`
Expected: installs without peer-dependency errors.

- [ ] **Step 3: Create `video/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "@/*": ["../*"] }
  },
  "include": ["src", "remotion.config.ts"]
}
```

- [ ] **Step 4: Create `video/remotion.config.ts`**

The site's components live outside `video/` and would resolve `react` from the root
`node_modules`, giving two Reacts and broken hooks; pin every React import to `video/node_modules`.

```ts
import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

const here = path.resolve(".");
const repo = path.resolve("..");
const mod = (name: string) => path.join(here, "node_modules", name);

Config.setVideoImageFormat("jpeg");
Config.overrideWebpackConfig((config) => {
  const withTailwind = enableTailwind(config);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        "@": repo,
        react: mod("react"),
        "react-dom": mod("react-dom"),
        "react/jsx-runtime": mod("react/jsx-runtime.js"),
        "lucide-react": mod("lucide-react"),
        "qrcode.react": mod("qrcode.react"),
        "next/image": path.join(here, "src/shims/next-image.tsx"),
      },
    },
  };
});
```

- [ ] **Step 5: Create the `next/image` stand-in `video/src/shims/next-image.tsx`**

```tsx
import type { ImgHTMLAttributes } from "react";

/** next/image without Next.js: a plain img. `fill` maps to absolute cover. */
type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; unoptimized?: boolean };

export default function Image({ fill, priority, unoptimized, style, alt = "", ...rest }: Props) {
  void priority;
  void unoptimized;
  const cover = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const } : {};
  return <img alt={alt} {...rest} style={{ ...cover, ...style }} />;
}
```

- [ ] **Step 6: Create `video/src/style.css`**

```css
@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@400;600&display=block");
@import "../../app/globals.css";
@source "../../components";
@source "./";

/* next/font variables, which the site's components read, defined here instead. */
:root {
  --font-survey: "Archivo";
  --font-survey-mono: "JetBrains Mono";
  --font-body: "Archivo";
  --font-display: "Archivo";
}
```

- [ ] **Step 7: Create the smoke `Showcase`, `Root.tsx`, `index.ts`**

`video/src/Showcase.tsx`:

```tsx
import { AbsoluteFill } from "remotion";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { CardMock } from "@/components/landing/CardMock";

export function Showcase() {
  return (
    <AbsoluteFill className="items-center justify-center" style={{ background: "#EEF1F4" }}>
      <CardMock className="w-[640px]">
        <DigitalBusinessCard fullName="Nicole Bautista" title="Interior Designer" company="Demo" phone="" email="" orientation="portrait" config={{ skin: "charcoal" }} />
      </CardMock>
    </AbsoluteFill>
  );
}
```

`video/src/Root.tsx`:

```tsx
import "./style.css";
import { Composition, continueRender, delayRender } from "remotion";
import { Showcase } from "./Showcase";

// Hold rendering until the webfonts are ready, so no frame uses a fallback face.
const fonts = delayRender("fonts");
document.fonts.ready.then(() => continueRender(fonts));

export function RemotionRoot() {
  return <Composition id="Showcase" component={Showcase} width={1080} height={1920} fps={30} durationInFrames={1080} />;
}
```

`video/src/index.ts`:

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

- [ ] **Step 8: Smoke-render one still and look at it**

Run: `cd video && npx remotion still src/index.ts Showcase out/smoke.png --frame=0`
Expected: `out/smoke.png` shows the Charcoal portrait card with "Nicole Bautista" in Archivo
(wide) on a light ground, with the CardMock edge and shadow.
If it fails with "Invalid hook call", the React aliases in Step 4 are not taking effect.
If it fails on a `.module.css` import, add to `overrideWebpackConfig` a rule that applies
`css-loader` with `modules: true` to `/\.module\.css$/` and excludes it from the default CSS rule.

- [ ] **Step 9: Root build still clean**

Run (repo root): `npx tsc --noEmit -p . 2>&1 | grep -v "^\.next/"`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add tsconfig.json .gitignore video/package.json video/package-lock.json video/tsconfig.json video/remotion.config.ts video/src
git commit -m "feat(video): Remotion project that renders the real card"
```

---

### Task 2: Timeline and copy, test-first

**Files:**
- Create: `video/src/timeline.ts`, `video/src/timeline.test.ts`, `video/src/copy.ts`, `video/src/copy.test.ts`

**Interfaces:**
- Produces:
  - `FPS = 30`, `TOTAL_FRAMES: number`
  - `type BeatId = "hook" | "tap" | "profile" | "leads" | "personas" | "cta"`
  - `BEATS: { id: BeatId; from: number; frames: number }[]` (frames, contiguous)
  - `beat(id: BeatId): { from: number; frames: number }`
  - `type Line = { beat: BeatId; text: string; at: number; hold: number }` (`at`, `hold` in frames; `at` relative to the beat)
  - `LINES: Line[]`, `linesFor(id: BeatId): Line[]`

- [ ] **Step 1: Write the failing tests**

`video/src/timeline.test.ts`:

```ts
import { expect, test } from "vitest";
import { BEATS, FPS, TOTAL_FRAMES, beat } from "./timeline";

test("beats run back to back from frame 0", () => {
  let next = 0;
  for (const b of BEATS) {
    expect(b.from).toBe(next);
    next = b.from + b.frames;
  }
  expect(next).toBe(TOTAL_FRAMES);
});

test("the story is 36 seconds ± 1, in the spec's order", () => {
  expect(Math.abs(TOTAL_FRAMES / FPS - 36)).toBeLessThanOrEqual(1);
  expect(BEATS.map((b) => b.id)).toEqual(["hook", "tap", "profile", "leads", "personas", "cta"]);
  expect(beat("profile")).toEqual({ from: 8 * FPS, frames: 8 * FPS });
});
```

`video/src/copy.test.ts`:

```ts
import { expect, test } from "vitest";
import { LINES } from "./copy";
import { FPS, beat } from "./timeline";

test("no line is longer than 7 words", () => {
  for (const l of LINES) expect(l.text.split(/\s+/).length, l.text).toBeLessThanOrEqual(7);
});

test("every line holds at least 1.5 s and ends inside its beat", () => {
  for (const l of LINES) {
    expect(l.hold, l.text).toBeGreaterThanOrEqual(1.5 * FPS);
    expect(l.at + l.hold, l.text).toBeLessThanOrEqual(beat(l.beat).frames);
  }
});

test("the CTA names the free profile and the site, and nothing quotes a price or a count", () => {
  const cta = LINES.filter((l) => l.beat === "cta").map((l) => l.text).join(" ");
  expect(cta).toContain("Create your free profile");
  expect(cta).toContain("connectaph.vercel.app");
  expect(LINES.map((l) => l.text).join(" ")).not.toMatch(/₱|\d+\s*(users|customers)/i);
});
```

- [ ] **Step 2: Run them to see them fail**

Run (repo root): `npx vitest run video/src/timeline.test.ts video/src/copy.test.ts`
Expected: FAIL, "Failed to resolve import ./timeline".

- [ ] **Step 3: Implement `video/src/timeline.ts`**

```ts
export const FPS = 30;

export type BeatId = "hook" | "tap" | "profile" | "leads" | "personas" | "cta";

const SECONDS: [BeatId, number][] = [
  ["hook", 3],
  ["tap", 5],
  ["profile", 8],
  ["leads", 6],
  ["personas", 8],
  ["cta", 6],
];

export const BEATS = SECONDS.reduce<{ id: BeatId; from: number; frames: number }[]>((acc, [id, s]) => {
  const prev = acc[acc.length - 1];
  return [...acc, { id, from: prev ? prev.from + prev.frames : 0, frames: s * FPS }];
}, []);

export const TOTAL_FRAMES = BEATS[BEATS.length - 1].from + BEATS[BEATS.length - 1].frames;

export function beat(id: BeatId): { from: number; frames: number } {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown beat ${id}`);
  return { from: b.from, frames: b.frames };
}
```

- [ ] **Step 4: Implement `video/src/copy.ts`**

```ts
import { FPS, type BeatId } from "./timeline";

export type Line = { beat: BeatId; text: string; at: number; hold: number };

const s = (n: number) => Math.round(n * FPS);

export const LINES: Line[] = [
  { beat: "hook", text: "Still handing out paper cards?", at: s(0.3), hold: s(2.5) },
  { beat: "tap", text: "Tap once.", at: s(1.5), hold: s(3.3) },
  { beat: "profile", text: "Your profile opens. Instantly.", at: s(0.5), hold: s(3.5) },
  { beat: "profile", text: "No app. Any phone.", at: s(4.3), hold: s(3.5) },
  { beat: "leads", text: "They leave their details.", at: s(0.5), hold: s(2.5) },
  { beat: "leads", text: "You follow up.", at: s(3.2), hold: s(2.6) },
  { beat: "personas", text: "Your card. Your work.", at: s(0.5), hold: s(7.3) },
  { beat: "cta", text: "Create your free profile", at: s(1.2), hold: s(4.6) },
  { beat: "cta", text: "connectaph.vercel.app", at: s(1.8), hold: s(4) },
];

export function linesFor(id: BeatId): Line[] {
  return LINES.filter((l) => l.beat === id);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run video/src/timeline.test.ts video/src/copy.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add video/src/timeline.ts video/src/timeline.test.ts video/src/copy.ts video/src/copy.test.ts
git commit -m "feat(video): timeline and on-screen copy with timing rules"
```

---

### Task 3: Motion maths and the three transitions

**Files:**
- Create: `video/src/motion.ts`, `video/src/motion.test.ts`, `video/src/transitions/LineWipe.tsx`, `video/src/transitions/LotDraw.tsx`, `video/src/transitions/PointSnap.tsx`, `video/src/Caption.tsx`

**Interfaces:**
- Consumes: `Line` from `./copy`.
- Produces:
  - `progress(frame: number, start: number, length: number): number` (0–1, clamped, ease-out cubic; throws if `length < 9`)
  - `<LineWipe at={number} length?={number} color?={string} ground?={string} />` (frames relative to the parent Sequence)
  - `<LotDraw at={number} length?={number} size={number} color={string} />`
  - `<PointSnap at={number} size?={number} color?={string} />`
  - `<Caption line={Line} ink={string} size?={number} />` (shows `line.text` from `line.at` for `line.hold`)

- [ ] **Step 1: Write the failing test `video/src/motion.test.ts`**

```ts
import { expect, test } from "vitest";
import { progress } from "./motion";

test("progress is 0 before, 1 after, and eases out in between", () => {
  expect(progress(0, 10, 20)).toBe(0);
  expect(progress(10, 10, 20)).toBe(0);
  expect(progress(30, 10, 20)).toBe(1);
  expect(progress(99, 10, 20)).toBe(1);
  const mid = progress(20, 10, 20);
  expect(mid).toBeGreaterThan(0.5); // ease-out: past half at the halfway frame
  expect(mid).toBeLessThan(1);
});

test("no move is shorter than 9 frames", () => {
  expect(() => progress(0, 0, 8)).toThrow(/at least 9 frames/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run video/src/motion.test.ts`
Expected: FAIL, "Failed to resolve import ./motion".

- [ ] **Step 3: Implement `video/src/motion.ts`**

```ts
/** Eased 0–1 progress of a move starting at `start` that lasts `length` frames. */
export function progress(frame: number, start: number, length: number): number {
  if (length < 9) throw new Error("a move must last at least 9 frames (300 ms)");
  const t = Math.min(1, Math.max(0, (frame - start) / length));
  return 1 - Math.pow(1 - t, 3);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run video/src/motion.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the transitions and caption**

`video/src/transitions/LineWipe.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { progress } from "../motion";

/** A 1.5 px rule sweeps left to right; the panel behind it covers the outgoing scene. */
export function LineWipe({ at, length = 15, color = "#2B3F8F", ground = "#EEF1F4" }: { at: number; length?: number; color?: string; ground?: string }) {
  const p = progress(useCurrentFrame(), at, length);
  if (p === 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${p * 100}%`, background: ground }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p * 100}%`, width: 1.5, background: color }} />
    </AbsoluteFill>
  );
}
```

`video/src/transitions/LotDraw.tsx`:

```tsx
import { useCurrentFrame } from "remotion";
import { progress } from "../motion";

// The brand's chamfered lot: a square with the top-right corner cut at 45°.
const LOT = "M2 2 H74 L98 26 V98 H2 Z";

export function LotDraw({ at, length = 30, size, color }: { at: number; length?: number; size: number; color: string }) {
  const p = progress(useCurrentFrame(), at, length);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={LOT} fill="none" stroke={color} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
```

`video/src/transitions/PointSnap.tsx`:

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export function PointSnap({ at, size = 28, color = "#FF5A52" }: { at: number; size?: number; color?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 12 });
  return <div aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: color, transform: `scale(${s})` }} />;
}
```

`video/src/Caption.tsx`:

```tsx
import { useCurrentFrame } from "remotion";
import { progress } from "./motion";
import type { Line } from "./copy";

/** One copy line in the site's wide display type: rises and fades in, fades out. */
export function Caption({ line, ink, size = 96 }: { line: Line; ink: string; size?: number }) {
  const frame = useCurrentFrame();
  const inP = progress(frame, line.at, 12);
  const outP = progress(frame, line.at + line.hold - 9, 9);
  const opacity = inP * (1 - outP);
  if (opacity === 0) return null;
  return (
    <p style={{ color: ink, fontFamily: "Archivo", fontVariationSettings: '"wdth" 125', fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.015em", opacity, transform: `translateY(${(1 - inP) * 24}px)`, maxWidth: 900, margin: 0 }}>
      {line.text}
    </p>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add video/src/motion.ts video/src/motion.test.ts video/src/transitions video/src/Caption.tsx
git commit -m "feat(video): line wipe, lot draw and point snap transitions"
```

---

### Task 4: QR value on the real card, then Hook and Tap scenes

**Files:**
- Modify: `components/ui/digital-business-card.tsx` (props interface ~line 15; `qrUrl` ~line 62)
- Create: `components/ui/digital-business-card.test.tsx`, `video/src/scenes/Hook.tsx`, `video/src/scenes/Tap.tsx`
- Modify: `video/src/Showcase.tsx` (temporarily, for stills)

**Interfaces:**
- Consumes: `linesFor`, `Caption`, `progress`, `PointSnap`; `CardFace` (prop `realistic?: boolean`), `MiniProfile` (`{ persona, saveLabel, form? }`), `PhoneFrame` (`{ children, className? }`) from `@/components/landing/Phone`; `HomeScreen` from `@/components/landing/Ios`; `PERSONAS` from `@/components/landing/IndustryDemo`.
- Produces: `DigitalBusinessCard` prop `qrValue?: string`; `<Hook />`, `<Tap />`.

- [ ] **Step 1: Write the failing card test `components/ui/digital-business-card.test.tsx`**

```tsx
import { expect, test, vi } from "vitest";
import { render } from "@testing-library/react";

// Capture what the card asks the QR to encode.
const encoded: string[] = [];
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => {
    encoded.push(value);
    return <svg />;
  },
}));

import { DigitalBusinessCard } from "./digital-business-card";

// The showcase video renders outside the site, where the page origin is the
// studio's localhost; a QR viewers can scan must point at the real site.
test("qrValue overrides the QR target", () => {
  render(<DigitalBusinessCard fullName="A" title="B" phone="" email="" orientation="portrait" qrValue="https://connectaph.vercel.app" />);
  expect(encoded.at(-1)).toBe("https://connectaph.vercel.app");
});

test("without qrValue the card still encodes the page origin", () => {
  render(<DigitalBusinessCard fullName="A" title="B" phone="" email="" orientation="portrait" />);
  expect(encoded.at(-1)).toBe(window.location.origin);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/ui/digital-business-card.test.tsx`
Expected: the first test FAILS (encodes `window.location.origin`); the second passes.

- [ ] **Step 3: Add the prop**

In `DigitalBusinessCardProps`, after `orientation?: CardOrientation;`, add:

```ts
  /** Encode this instead of the profile URL (marketing video, where the page origin is not the site). */
  qrValue?: string;
```

Replace the `qrUrl` line in `DigitalBusinessCard` with:

```ts
  const qrUrl = props.qrValue ?? (props.profileId ? profileUrl(host, { id: props.profileId, slug: props.profileSlug }) : host);
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/ui/digital-business-card.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `video/src/scenes/Hook.tsx`** (graphite sheet; a paper card slides off)

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";

export function Hook() {
  const frame = useCurrentFrame();
  const away = progress(frame, 45, 30);
  return (
    <AbsoluteFill style={{ background: "#12161F", padding: 96, justifyContent: "space-between" }}>
      <div>{linesFor("hook").map((l) => <Caption key={l.text} line={l} ink="#EEF1F4" />)}</div>
      {/* A plain paper card, sliding off frame. A fictional placeholder name and a dummy number. */}
      <div style={{ alignSelf: "center", width: 620, aspectRatio: "85.6 / 54", background: "#FAFAF7", borderRadius: 8, padding: 40, transform: `translateX(${away * 1100}px) rotate(${away * 12}deg)`, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.12), 0 14px 30px -12px rgb(0 0 0 / 0.5)" }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 40, color: "#222", margin: 0 }}>Juan Dela Cruz</p>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#555", margin: "8px 0 0" }}>Sales Agent · 0900 000 0000</p>
      </div>
      <div style={{ height: 96 }} />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 6: Implement `video/src/scenes/Tap.tsx`** (whiteprint; card meets phone, ripple, profile opens)

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CardFace, MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { HomeScreen } from "@/components/landing/Ios";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { PointSnap } from "../transitions/PointSnap";

export function Tap() {
  const frame = useCurrentFrame();
  const swing = progress(frame, 0, 24); // card flies in
  const ripple = progress(frame, 30, 24); // NFC ripple
  const open = progress(frame, 48, 18); // profile slides over the home screen
  return (
    <AbsoluteFill style={{ background: "#EEF1F4", padding: 96, gap: 64 }}>
      <div style={{ height: 120 }}>{linesFor("tap").map((l) => <Caption key={l.text} line={l} ink="#12161F" />)}</div>
      <div style={{ position: "relative", alignSelf: "center", width: 560 }}>
        <PhoneFrame className="relative">
          <div style={{ position: "absolute", inset: 0 }}><HomeScreen /></div>
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - open) * 100}%)`, background: "#EEF1F4" }}>
            <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" />
          </div>
        </PhoneFrame>
        <div style={{ position: "absolute", left: -180, top: 40, width: 420, transform: `translate(${(1 - swing) * -700}px, ${(1 - swing) * -300}px) rotate(${-14 + swing * 14}deg)` }}>
          <CardFace skin="charcoal" realistic className="w-full" />
        </div>
        {ripple > 0 && ripple < 1 && (
          <div style={{ position: "absolute", left: 60, top: 120, width: 300, height: 300, borderRadius: "50%", border: "1.5px solid #2B3F8F", opacity: 1 - ripple, transform: `scale(${0.4 + ripple})` }} />
        )}
        <div style={{ position: "absolute", left: 200, top: 260 }}><PointSnap at={30} /></div>
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 7: Stills**

Temporarily set the body of `Showcase` to `<Hook />` and run
`cd video && npx remotion still src/index.ts Showcase out/hook.png --frame=60`;
then to `<Tap />` and run `--frame=70` writing `out/tap.png`. View both PNGs.
Expected: Hook shows the white paper card mid-slide under "Still handing out paper cards?" on
dark; Tap shows the phone with the broker profile open and the Charcoal card beside it with its
edge and shadow. Adjust offsets until both read clearly when the PNG is viewed at 25 %.

- [ ] **Step 8: Commit**

```bash
git add components/ui/digital-business-card.tsx components/ui/digital-business-card.test.tsx video/src/scenes/Hook.tsx video/src/scenes/Tap.tsx video/src/Showcase.tsx
git commit -m "feat(video): hook and tap scenes; card accepts a fixed QR value"
```

---

### Task 5: Profile and Leads scenes

**Files:**
- Create: `video/src/scenes/Profile.tsx`, `video/src/scenes/Leads.tsx`
- Modify: `video/src/Showcase.tsx` (temporarily, for stills)

**Interfaces:**
- Consumes: `MiniProfile` (`form?: 0 | 1 | 2 | 3`: 0 no form, 1 form shown, 2 filled, 3 sent), `PhoneFrame`, `PERSONAS`, `Caption`, `linesFor`, `progress`, `LotDraw`.
- Produces: `<Profile />`, `<Leads />`.

- [ ] **Step 1: Implement `video/src/scenes/Profile.tsx`** (whiteprint; the profile scrolls; a lot draws round the phone)

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { LotDraw } from "../transitions/LotDraw";

export function Profile() {
  const frame = useCurrentFrame();
  const scroll = progress(frame, 90, 120); // gentle scroll down to the listings
  return (
    <AbsoluteFill style={{ background: "#EEF1F4", padding: 96, gap: 48 }}>
      <div style={{ height: 220 }}>{linesFor("profile").map((l) => <Caption key={l.text} line={l} ink="#12161F" size={84} />)}</div>
      <div style={{ position: "relative", alignSelf: "center", width: 600 }}>
        <PhoneFrame className="relative">
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div style={{ transform: `translateY(${-scroll * 45}%)` }}>
              <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" />
            </div>
          </div>
        </PhoneFrame>
        <div style={{ position: "absolute", left: -40, top: -40 }}><LotDraw at={10} size={680} color="#2B3F8F" /></div>
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 2: Implement `video/src/scenes/Leads.tsx`** (graphite; form fills; "New lead" lands, ruled in red)

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame, type FormPhase } from "@/components/landing/Phone";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { LANDING_COPY } from "@/components/landing/copy";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";

export function Leads() {
  const frame = useCurrentFrame();
  const form: FormPhase = frame < 20 ? 1 : frame < 75 ? 2 : 3; // shown → filled → sent
  const banner = progress(frame, 85, 15);
  return (
    <AbsoluteFill style={{ background: "#12161F", padding: 96, gap: 48 }}>
      <div style={{ height: 220 }}>{linesFor("leads").map((l) => <Caption key={l.text} line={l} ink="#EEF1F4" size={84} />)}</div>
      <div style={{ position: "relative", alignSelf: "center", width: 600 }}>
        <PhoneFrame className="relative">
          <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" form={form} />
        </PhoneFrame>
        {/* The owner's notification; red is the status colour. */}
        <div style={{ position: "absolute", left: 40, right: 40, top: 60, transform: `translateY(${(1 - banner) * -160}px)`, opacity: banner, background: "#EEF1F4", border: "1.5px solid #D0312D", padding: "24px 28px", fontFamily: "Archivo" }}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#C42A26" }}>{LANDING_COPY.newLead}</p>
          <p style={{ margin: "6px 0 0", fontSize: 30, color: "#12161F" }}>{LANDING_COPY.leadDemo}</p>
        </div>
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 3: Stills**

Set `Showcase` to `<Profile />` and render `--frame=60` and `--frame=200` to `out/profile-a.png`,
`out/profile-b.png`; then `<Leads />` at `--frame=60` and `--frame=150` to `out/leads-a.png`,
`out/leads-b.png`. View all four.
Expected: profile-a shows the lot partly drawn round the phone; profile-b shows the listings
scrolled in; leads-a shows the filled form; leads-b shows the red-ruled "New lead" card.

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/Profile.tsx video/src/scenes/Leads.tsx video/src/Showcase.tsx
git commit -m "feat(video): profile and leads scenes"
```

---

### Task 6: Personas and CTA scenes; assemble the Showcase

**Files:**
- Create: `video/src/scenes/Personas.tsx`, `video/src/scenes/Cta.tsx`
- Modify: `video/src/Showcase.tsx` (final version)

**Interfaces:**
- Consumes: `SHOWCASE` (`@/components/landing/SkinShowcase`, `{ skin: CardSkinId; persona: Industry }[]`), `PERSONAS`, `DigitalBusinessCard` (`qrValue`), `CardMock`, `cardSkin` (`@/lib/cardSkins`), `BEATS`, `BeatId`, `LineWipe`, `LotDraw`, `PointSnap`, `Caption`, `linesFor`.
- Produces: final `<Showcase />` and `MUSIC: string | null`.

- [ ] **Step 1: Implement `video/src/scenes/Personas.tsx`** (one card per 2 s; line wipe between)

```tsx
import { AbsoluteFill, Sequence } from "remotion";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { CardMock } from "@/components/landing/CardMock";
import { SHOWCASE } from "@/components/landing/SkinShowcase";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { cardSkin } from "@/lib/cardSkins";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { LineWipe } from "../transitions/LineWipe";

const EACH = 60; // 2 s per persona; 4 personas fill the 8 s beat

export function Personas() {
  return (
    <AbsoluteFill style={{ background: "#EEF1F4" }}>
      {SHOWCASE.map(({ skin, persona }, i) => {
        const p = PERSONAS[persona];
        return (
          <Sequence key={skin} from={i * EACH} durationInFrames={EACH + 15}>
            <AbsoluteFill style={{ background: "#EEF1F4", alignItems: "center", justifyContent: "center", gap: 40 }}>
              <CardMock className="w-[620px]">
                <DigitalBusinessCard fullName={p.name} title={p.title} company={p.company} phone="" email="" avatarUrl={p.photo} config={{ skin }} orientation="portrait" qrValue="https://connectaph.vercel.app" />
              </CardMock>
              <p style={{ fontFamily: "Archivo", fontSize: 40, fontWeight: 700, color: "#12161F", margin: 0 }}>{cardSkin(skin).label}</p>
            </AbsoluteFill>
            {i < SHOWCASE.length - 1 && <LineWipe at={EACH - 15} />}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ padding: 96 }}>{linesFor("personas").map((l) => <Caption key={l.text} line={l} ink="#12161F" size={84} />)}</AbsoluteFill>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 2: Implement `video/src/scenes/Cta.tsx`** (blueprint; lot draws, point snaps, CTA)

```tsx
import { AbsoluteFill } from "remotion";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { LotDraw } from "../transitions/LotDraw";
import { PointSnap } from "../transitions/PointSnap";

export function Cta() {
  const [title, url] = linesFor("cta");
  return (
    <AbsoluteFill style={{ background: "#2B3F8F", padding: 96, justifyContent: "center", gap: 56 }}>
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <LotDraw at={0} length={30} size={220} color="#EEF1F4" />
        <div style={{ position: "absolute", right: 18, bottom: 18 }}><PointSnap at={30} size={32} /></div>
      </div>
      <Caption line={title} ink="#F4F6FA" size={104} />
      <Caption line={url} ink="#C9D3F2" size={54} />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 3: Replace `video/src/Showcase.tsx`**

```tsx
import type { JSX } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BEATS, TOTAL_FRAMES, type BeatId } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Tap } from "./scenes/Tap";
import { Profile } from "./scenes/Profile";
import { Leads } from "./scenes/Leads";
import { Personas } from "./scenes/Personas";
import { Cta } from "./scenes/Cta";

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
      {MUSIC && <Audio src={staticFile(MUSIC)} volume={(f) => 0.6 * Math.min(1, (TOTAL_FRAMES - f) / FADE)} />}
    </AbsoluteFill>
  );
}
```

- [ ] **Step 4: One still per beat**

From `video/`:

```bash
for f in 60 150 360 600 780 1020; do npx remotion still src/index.ts Showcase out/beat-$f.png --frame=$f; done
```

View all six PNGs. Expected: each matches its row in the spec's story table; nothing is cut off at
the frame edge; text stays legible when the PNG is viewed at 25 %.

- [ ] **Step 5: Commit**

```bash
git add video/src/scenes/Personas.tsx video/src/scenes/Cta.tsx video/src/Showcase.tsx
git commit -m "feat(video): personas and CTA scenes; full timeline assembled"
```

---

### Task 7: Render, probe, done gate, push

**Files:**
- Create: `video/scripts/probe.mjs`

- [ ] **Step 1: Write `video/scripts/probe.mjs`**

```js
// Checks the rendered MP4 against the spec: 1080x1920, 30 fps, 36 s ± 1 s.
import { execFileSync } from "node:child_process";

const file = process.argv[2];
const out = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", file]).toString(),
);
const { width, height, r_frame_rate } = out.streams[0];
const [n, d] = r_frame_rate.split("/").map(Number);
const fps = n / d;
const duration = Number(out.format.duration);
const problems = [];
if (width !== 1080 || height !== 1920) problems.push(`size ${width}x${height}, want 1080x1920`);
if (Math.abs(fps - 30) > 0.01) problems.push(`fps ${fps}, want 30`);
if (Math.abs(duration - 36) > 1) problems.push(`duration ${duration}s, want 36 ± 1`);
console.log(JSON.stringify({ width, height, fps, duration, ok: problems.length === 0, problems }));
process.exit(problems.length ? 1 : 0);
```

- [ ] **Step 2: Render**

Run: `cd video && npm run render`
Expected: `out/connecta-showcase-9x16.mp4` written; no errors in the log.

- [ ] **Step 3: Probe** (Haiku subagent: run the command, report only the JSON line)

Run: `cd video && npm run probe`
Expected: `{"width":1080,"height":1920,"fps":30,"duration":36,"ok":true,"problems":[]}` (duration may print as 36.0x).

- [ ] **Step 4: Full checks**

Run (repo root): `npx vitest run` and `npx tsc --noEmit -p . 2>&1 | grep -v "^\.next/"`
Expected: all tests pass (previous total + 7 video tests + 2 card tests); tsc prints nothing.

- [ ] **Step 5: Jev done gate**

Call `jev_check` with `state` = the probe JSON, the test totals and the still-review notes, the
question "Does the render meet every check in the spec?", and criteria
`{ "true": "Every check in the spec passes", "false": "At least one spec check fails" }`.
On `review` or `abstain`, the owner looks before Step 6.

- [ ] **Step 6: Gate 2, then push**

Show the owner the MP4 path and three stills. On approval:

```bash
git add video/scripts/probe.mjs
git commit -m "feat(video): render probe"
git push origin rename/connecta
```

---

## Follow-ups (not in this plan)

- Persona portraits: once Weave is linked and the model's output terms are checked, add the four
  files to `public/marketing/` and fill `DEMO_PORTRAITS`; the video picks them up through `PERSONAS`.
- Music: once a licensed track is chosen, copy it to `video/public/` and set `MUSIC` in
  `video/src/Showcase.tsx`; retime cuts to its beats in `timeline.ts` if needed.
- 16:9 cut: a second composition reusing the scenes.
