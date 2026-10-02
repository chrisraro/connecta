# Connecta PH showcase video — design

Date: 2026-10-02. Status: approved in brainstorming, awaiting spec review.

## Goal

A 36-second vertical social ad (Facebook, Instagram, TikTok) that makes a Naga professional
create a free Connecta profile. It must work muted.

| Decision | Choice |
|---|---|
| Format | 9:16, 1080 × 1920, 30 fps, about 36 s |
| Call to action | "Create your free profile" + connectaph.vercel.app (no card price) |
| Audio | Licensed music track, no voiceover; every message is on-screen text |
| Roadmap | Not shown (planned features stay off the ad) |
| Method | Remotion, built from the app's real components |

## Story

| Time | Beat | On screen |
|---|---|---|
| 0–3 s | Hook | "Still handing out paper cards?" A paper card slides off frame. |
| 3–8 s | Tap | The Charcoal card (edge + shadow) swings in and touches a phone; an NFC ripple; the phone opens a profile. |
| 8–16 s | Profile | The real profile scrolls: photo, role, Save contact, listings. "No app. Any phone." |
| 16–22 s | Leads | "Send my details" fills; a "New lead" notification lands. "They leave their details. You follow up." |
| 22–30 s | Built for you | Line wipes across the four demo personas on their skins. "Your card. Your work." |
| 30–36 s | CTA | The mark's lot draws closed and the red point snaps in. "Create your free profile", connectaph.vercel.app. |

## Visual style

- Each act sits on one of the product's sheets: whiteprint (default), graphite (hook, leads),
  blueprint (CTA). Type is Archivo, wide cut, flush left.
- Red appears only as the point mark and the "New lead" status.
- Transitions, all from the survey-plan idea:
  - **Line wipe** (main cut): a 1.5 px rule sweeps across and reveals the next scene.
  - **Lot draw**: the chamfered lot boundary draws closed around the profile photo and the final mark.
  - **Point snap**: the red point marks the tap, the lead and the CTA.
- Motion: springs with almost no overshoot; no move faster than about 300 ms.
- Text: at most 7 words per line; each line holds at least 1.5 s.
- Cards use the CardMock edge and shadow. The phone is the homepage's iPhone mockup.
- Not allowed: glows, blurs, emoji, invented numbers, stock photos of people, roadmap items.
- Music: mixed low, cuts on its beats, fades out over the last 2 s.

## Build

- `video/` folder in this repo with its own `package.json`. Remotion stays out of the website's
  install and Vercel build.
- Remotion licence: free for individuals and for-profit companies with up to 3 employees
  (Remotion LICENSE.md). Connecta is run by a sole proprietor, so the free licence applies.
- Webpack alias `@/` → repo root, so scenes import the real `DigitalBusinessCard`, `CardFace`,
  `CardMock`, the phone frame and the public profile. Tailwind v4 through Remotion's Tailwind
  plugin; Archivo through `@remotion/google-fonts`.
- Next.js-only modules (`next/link`, `next/image`, `next/navigation`) get small video-only stand-ins.
  Data hooks get a stub `QueryClientProvider`. If a component still will not render outside
  Next.js, its scene gets a purpose-built copy that matches it visually, and the owner is told which.
- `video/src/timeline.ts` holds every beat's start and length. `video/src/copy.ts` holds every
  on-screen line. Scenes read both, so retiming or rewording never touches a scene.
- Six scenes: Hook, Tap, Profile, Leads, Personas, Cta. Three transitions: LineWipe, LotDraw,
  PointSnap.
- Output: `video/out/connecta-showcase-9x16.mp4` (git-ignored; only source is committed).

## Dependencies

- **Persona portraits**: AI portraits of people who do not exist, via Figma Weave, once the owner
  links Figma to Weave. The model's output terms are checked before use. Until then the card's
  no-photo placeholder renders.
- **Music**: the owner supplies a track, or picks one from suggestions with their licence terms.
  Beat timing is set once it is chosen.

Neither blocks building the scenes.

## Workflow

- Each build item: Jev intake (route, ready, risk) → ECC orch-add-feature (Gate 1 plan, tests
  first, code review, Gate 2 commit) → Jev done gate.
- Model routing: Sonnet subagents for scaffold and scene work; Haiku for render-log and
  ffprobe checks; the main session for design decisions and review.
- Token use: verify with one still per beat (`remotion still`), viewed as images; render the
  full MP4 only at milestones. Subagents get short, specific briefs.

## Checks

- Unit tests on `timeline.ts`: beats contiguous, total 36 s ± 1 s.
- Unit tests on `copy.ts`: no line over 7 words; every line holds at least 1.5 s.
- One still per beat, reviewed before the full render.
- ffprobe on the final file: 1080 × 1920, 30 fps, duration 36 s ± 1 s.
