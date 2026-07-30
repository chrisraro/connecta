# Herald — Rebrand, Template Refactor & Public Profile Rebuild

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Tapfolio → **Herald**, collapse 2,687 lines of triplicated template code into one renderer driven by theme descriptors, make the three templates genuinely distinct compositions (not one design with three palettes), load the fonts that currently never load, and turn the public profile into a server-rendered, shareable, SEO-visible surface with vanity slugs.

**Architecture:** A single `<ProfileRenderer>` renders an ordered list of section components. Each section reads a `TemplateTheme` descriptor that carries not only color and type but **composition variants** (hero layout, section width, rhythm, rule style) — this is what makes three templates genuinely different instead of three palettes over one layout. Brand tokens live in one place so the Herald identity is swappable. The public profile becomes a React Server Component with `generateMetadata` and a dynamic OG image.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind 4, Convex, `next/font/google`, `next/og`, Vitest + convex-test.

## Global Constraints

- Branch: `redesign/product-ux` (already checked out). Never commit to `main`.
- **Brand name is `Herald`.** Every user-facing string reading "Tapfolio"/"TapFolio" becomes "Herald". The npm package name, the repo folder, and the `convex` deployment name stay as-is (renaming those is out of scope and risks breaking deploys).
- Every task follows red-green-refactor where the change is unit-testable. Pure logic (theme resolution, slug generation, section ordering) MUST have failing-first tests. Visual/RSC changes are verified by `npm run build` plus explicit manual browser verification.
- **No new AI-slop patterns.** Specifically banned in all new code: gradient text (`bg-clip-text` + gradient), decorative glassmorphism, uppercase tracked eyebrow labels above every section, hero stat strips, identical 3-card feature grids, `border-left` accent stripes > 1px, `rounded-[2rem]`+ on cards, animated counters.
- **Radius scale is exactly three values** — `--r-sm` (6px, inputs/chips), `--r-md` (12px, cards/panels), `--r-lg` (20px, sheets/modals) — plus `rounded-full` for pills/avatars only. No arbitrary `rounded-[Npx]` anywhere in new or touched code.
- **Elevation scale is exactly two values** — `--e-raised`, `--e-overlay`. No `shadow-2xl`, no hand-written `boxShadow` strings.
- Body text must hit **≥4.5:1** contrast against its background; large text ≥3:1. Never express muted text as an opacity suffix on a hex (`${color}60`) — use a resolved token.
- Every animation needs a `@media (prefers-reduced-motion: reduce)` alternative. The existing opt-in gating pattern in `app/globals.css` is correct — preserve it.
- Fonts load via `next/font/google` only. Zero `@import url(fonts.googleapis.com)`, zero bare `fontFamily: "'X', sans-serif"` strings referencing an unloaded face.
- Run `npx convex codegen` after any `convex/schema.ts` change. If it fails with a 401 in this sandbox that is expected and non-blocking — convex-test reads the schema directly.
- Commit after every task with a `feat:`/`refactor:`/`perf:` prefix referencing the task.

---

## Task 1: Herald brand foundation — tokens, real fonts, enforced scales

**Files:**
- Create: `lib/brand.ts`
- Create: `lib/fonts.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Test: `lib/brand.test.ts`

**Interfaces:**
- Produces: `HERALD` brand constant (`lib/brand.ts`) exporting `{ name, tagline, domain }` and `contrastRatio(a, b): number` / `meetsAA(fg, bg, large?): boolean` helpers used by later tasks to assert palette legibility.
- Produces: `lib/fonts.ts` exporting `displayFont`, `bodyFont`, `monoFont` (next/font instances) plus `templateFonts` — a map of the four faces the three templates actually need, each a real loaded `next/font` instance exposing `.variable`.
- Produces: CSS custom properties `--r-sm|md|lg`, `--e-raised`, `--e-overlay`, and the Herald color ramp, all consumed by Tasks 2–4.

- [ ] **Step 1: Write the failing contrast-helper test**

Create `lib/brand.test.ts`:

```typescript
import { expect, test } from "vitest";
import { contrastRatio, meetsAA, HERALD } from "./brand";

test("contrastRatio computes the WCAG ratio for black on white", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
});

test("contrastRatio is symmetric", () => {
  const a = contrastRatio("#705838", "#fbf9f4");
  const b = contrastRatio("#fbf9f4", "#705838");
  expect(a).toBeCloseTo(b, 5);
});

test("meetsAA rejects a low-contrast muted gray on near-white", () => {
  expect(meetsAA("#a8a29e", "#fbf9f4")).toBe(false);
});

test("meetsAA accepts body-safe ink on near-white", () => {
  expect(meetsAA("#2a2724", "#fbf9f4")).toBe(true);
});

test("meetsAA is more permissive for large text", () => {
  expect(meetsAA("#8a8178", "#fbf9f4", true)).toBe(true);
  expect(meetsAA("#8a8178", "#fbf9f4", false)).toBe(false);
});

test("HERALD brand constant carries the product name", () => {
  expect(HERALD.name).toBe("Herald");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/brand.test.ts`
Expected: FAIL — `lib/brand.ts` does not exist.

- [ ] **Step 3: Implement `lib/brand.ts`**

```typescript
/**
 * Herald brand constants and contrast utilities.
 *
 * The name comes from the medieval herald, whose two duties map exactly onto
 * this product: formally announcing a person on arrival, and designing the
 * coat of arms that identified them.
 */

export const HERALD = {
  name: "Herald",
  tagline: "Announced properly.",
  domain: "herald.ph",
} as const;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.trim().toLowerCase().replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-f]{6}$/.test(c)) return null;
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

/** WCAG 2.1 contrast ratio between two hex colors. Range 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when fg on bg clears WCAG AA: 4.5:1 normal text, 3:1 large text. */
export function meetsAA(fg: string, bg: string, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? 3 : 4.5);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/brand.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Create `lib/fonts.ts` with real font loading**

This closes the single worst craft failure found in the audit: all three templates specify faces that are never loaded, so they render in Helvetica/Times on iOS.

```typescript
import {
  Fraunces,
  Geist,
  Geist_Mono,
  Manrope,
  Space_Grotesk,
  Newsreader,
} from "next/font/google";

/** Herald's own display face — high-contrast variable serif with real character. */
export const displayFont = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

/** App UI + body. Serif is banned on dashboard surfaces. */
export const bodyFont = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const monoFont = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

/** Per-template faces. Each template's identity is primarily typographic,
 *  so these must actually load — see Task 2's TemplateTheme.fontVars. */
export const editorialSerif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-editorial",
});

export const kineticGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-kinetic",
});

export const architecturalSans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-architectural",
});

/** Every font variable class, for the <html> element. */
export const allFontVariables = [
  displayFont.variable,
  bodyFont.variable,
  monoFont.variable,
  editorialSerif.variable,
  kineticGrotesk.variable,
  architecturalSans.variable,
].join(" ");
```

- [ ] **Step 6: Wire fonts into the root layout**

In `app/layout.tsx`: import `allFontVariables` from `@/lib/fonts` and add it to the `<html>` element's `className` (preserving whatever classes are already there, e.g. `suppressHydrationWarning` and any theme class). Remove the existing Geist import if it duplicates `lib/fonts.ts`. Also update the static `metadata` export: `title` and `description` must say **Herald**, not TapFolio.

- [ ] **Step 7: Replace the render-blocking font import and add the enforced scales in `app/globals.css`**

Delete the `@import url(...fonts.googleapis.com...)` on line 1 — it is render-blocking and now redundant.

Then, inside the existing `:root` block, **add** these (do not remove existing tokens yet; Task 2 retires the unused ones):

```css
  /* Herald — enforced scales. Exactly three radii, exactly two elevations. */
  --r-sm: 6px;
  --r-md: 12px;
  --r-lg: 20px;
  --e-raised: 0 1px 2px rgb(28 22 20 / 0.04), 0 2px 8px rgb(28 22 20 / 0.06);
  --e-overlay: 0 4px 12px rgb(28 22 20 / 0.08), 0 12px 32px rgb(28 22 20 / 0.12);

  /* Herald identity — the seal pressed into wax. Committed color strategy:
     one saturated brand color carrying real surface area, warm neutrals
     tinted toward its own hue rather than toward generic warmth. */
  --herald-seal: oklch(0.44 0.132 27);
  --herald-seal-hover: oklch(0.39 0.138 27);
  --herald-ink: oklch(0.22 0.012 40);
  --herald-ink-soft: oklch(0.46 0.014 40);
  --herald-paper: oklch(0.985 0.003 60);
  --herald-surface: oklch(0.96 0.005 55);
  --herald-line: oklch(0.90 0.008 50);
```

Then **remove** the blanket heading-serif override. Find the rule that sets `h1..h6 { font-family: var(--font-serif) }` and delete it — it silently forces Tinos onto every dashboard, shop and admin heading. Headings pick their face from their surface instead (brand surfaces opt into `--font-display`).

- [ ] **Step 8: Verify build and full suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds; suite passes with 6 more tests than before (45 total).

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Open the landing page and the dashboard. Confirm: (a) headings are no longer Times/Tinos on the dashboard, (b) no FOUT flash of an unstyled serif, (c) DevTools → Network shows the Google Fonts CSS `@import` request is **gone** and fonts are served from `/_next/static/media/`. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add lib/brand.ts lib/brand.test.ts lib/fonts.ts app/globals.css app/layout.tsx
git commit -m "feat(herald): brand tokens, real font loading, enforced radius/elevation scales"
```

---

## Task 2: Collapse three templates into one renderer + theme descriptors

**Files:**
- Create: `components/templates/theme.ts`
- Create: `components/templates/sections/` — one file per section (15 files)
- Create: `components/templates/ProfileRenderer.tsx`
- Modify: `components/templates/registry.ts`
- Modify: `app/p/[id]/page.tsx`
- Modify: `app/dashboard/builder/page.tsx`
- Delete: `components/templates/Editorial.tsx`, `Kinetic.tsx`, `Architectural.tsx`, `Default.tsx`
- Test: `components/templates/theme.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`/`meetsAA` from `lib/brand.ts` (Task 1); the font variables from `lib/fonts.ts` (Task 1).
- Produces: `TemplateTheme` type and `TEMPLATE_THEMES: Record<TemplateId, TemplateTheme>` from `components/templates/theme.ts`. `resolveTheme(templateId, userPalette)` merges a user's chosen colors over a template's defaults and returns a fully-resolved theme with contrast-corrected muted/ink values.
- Produces: `<ProfileRenderer data={profileData} />` — the single entry point replacing all three template components. It reads `data.componentOrder`, resolves the theme from `data.theme` + `layoutConfig.themeId`, and renders sections in order.
- Consumed by: `app/p/[id]/page.tsx` and the builder's live preview, which both stop importing individual template components.

**Critical design requirement:** `TemplateTheme` MUST carry **composition** fields, not only color/type. If the only difference between templates is a palette, this refactor has reproduced the exact defect the audit identified. The composition fields are what make Editorial actually editorial and Kinetic actually kinetic.

- [ ] **Step 1: Write the failing theme-resolution test**

Create `components/templates/theme.test.ts`:

```typescript
import { expect, test } from "vitest";
import { TEMPLATE_THEMES, resolveTheme, TEMPLATE_IDS } from "./theme";
import { meetsAA } from "@/lib/brand";

test("exports exactly three templates", () => {
  expect(TEMPLATE_IDS).toEqual(["editorial", "kinetic", "architectural"]);
});

test("every template's default body text clears WCAG AA on its own background", () => {
  for (const id of TEMPLATE_IDS) {
    const t = TEMPLATE_THEMES[id];
    expect(
      meetsAA(t.colors.ink, t.colors.background),
      `${id}: ink ${t.colors.ink} on bg ${t.colors.background}`
    ).toBe(true);
  }
});

test("every template's muted text clears WCAG AA — no opacity-suffix muting", () => {
  for (const id of TEMPLATE_IDS) {
    const t = TEMPLATE_THEMES[id];
    expect(
      meetsAA(t.colors.inkSoft, t.colors.background),
      `${id}: inkSoft ${t.colors.inkSoft} on bg ${t.colors.background}`
    ).toBe(true);
  }
});

test("the three templates use genuinely different compositions, not just palettes", () => {
  const heroes = TEMPLATE_IDS.map((id) => TEMPLATE_THEMES[id].composition.hero);
  expect(new Set(heroes).size).toBe(3);
  const widths = TEMPLATE_IDS.map((id) => TEMPLATE_THEMES[id].composition.measure);
  expect(new Set(widths).size).toBeGreaterThan(1);
});

test("the three templates load three different display faces", () => {
  const faces = TEMPLATE_IDS.map((id) => TEMPLATE_THEMES[id].fontVars.display);
  expect(new Set(faces).size).toBe(3);
});

test("resolveTheme lets a user palette override brand colors but keeps composition", () => {
  const resolved = resolveTheme("editorial", {
    primaryColor: "#123456",
    backgroundColor: "#ffffff",
    textColor: "#111111",
  });
  expect(resolved.colors.accent).toBe("#123456");
  expect(resolved.colors.background).toBe("#ffffff");
  expect(resolved.composition.hero).toBe(TEMPLATE_THEMES.editorial.composition.hero);
});

test("resolveTheme repairs a user palette that would fail contrast", () => {
  // Near-white text on a white background must not survive resolution.
  const resolved = resolveTheme("editorial", {
    primaryColor: "#705838",
    backgroundColor: "#ffffff",
    textColor: "#fdfdfd",
  });
  expect(meetsAA(resolved.colors.ink, resolved.colors.background)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/templates/theme.test.ts`
Expected: FAIL — `./theme` does not exist.

- [ ] **Step 3: Implement `components/templates/theme.ts`**

```typescript
import { meetsAA } from "@/lib/brand";

export const TEMPLATE_IDS = ["editorial", "kinetic", "architectural"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** How a template composes space — this is what makes templates distinct.
 *  Colour alone produces one design in three costumes. */
export interface TemplateComposition {
  /** Hero architecture. */
  hero: "editorial-stack" | "full-bleed-portrait" | "structured-split";
  /** Content measure. narrow ≈ 448px, wide ≈ 640px, full = edge-to-edge. */
  measure: "narrow" | "wide" | "full";
  /** Vertical rhythm between sections. */
  rhythm: "tight" | "generous" | "cinematic";
  /** How section boundaries read. */
  rule: "none" | "hairline" | "numbered";
  /** Whether section headings sit above content or beside it. */
  headingPlacement: "above" | "beside";
  /** Image treatment for galleries/projects. */
  imagery: "inset" | "bleed" | "masonry";
}

export interface TemplateColors {
  background: string;
  surface: string;
  ink: string;
  inkSoft: string;
  accent: string;
  line: string;
}

export interface TemplateFontVars {
  /** CSS var name from lib/fonts.ts — MUST be a face that is actually loaded. */
  display: string;
  body: string;
}

export interface TemplateTheme {
  id: TemplateId;
  name: string;
  description: string;
  colors: TemplateColors;
  fontVars: TemplateFontVars;
  composition: TemplateComposition;
}

export const TEMPLATE_THEMES: Record<TemplateId, TemplateTheme> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    description:
      "Magazine typography, generous measure, imagery that breaks the column. For writers, consultants and photographers.",
    colors: {
      background: "#fbf9f4",
      surface: "#f3f0e9",
      ink: "#1f1d18",
      inkSoft: "#5b564c",
      accent: "#7a5c34",
      line: "#ddd6c9",
    },
    fontVars: { display: "--font-tpl-editorial", body: "--font-body" },
    composition: {
      hero: "editorial-stack",
      measure: "wide",
      rhythm: "cinematic",
      rule: "hairline",
      headingPlacement: "beside",
      imagery: "bleed",
    },
  },
  kinetic: {
    id: "kinetic",
    name: "Kinetic",
    description:
      "Dark, oversized type, edge-to-edge sections with scroll-linked entrances. For developers and studios.",
    colors: {
      background: "#0e0e10",
      surface: "#17171a",
      ink: "#f2f0ee",
      inkSoft: "#a9a5a0",
      accent: "#c9a227",
      line: "#2a2a2f",
    },
    fontVars: { display: "--font-tpl-kinetic", body: "--font-body" },
    composition: {
      hero: "full-bleed-portrait",
      measure: "full",
      rhythm: "tight",
      rule: "numbered",
      headingPlacement: "above",
      imagery: "masonry",
    },
  },
  architectural: {
    id: "architectural",
    name: "Architectural",
    description:
      "Strict modular grid, visible structure, disciplined negative space. For executives and firms.",
    colors: {
      background: "#f7f8f9",
      surface: "#ffffff",
      ink: "#16191c",
      inkSoft: "#535a61",
      accent: "#1f3d5c",
      line: "#dfe3e7",
    },
    fontVars: { display: "--font-tpl-architectural", body: "--font-body" },
    composition: {
      hero: "structured-split",
      measure: "narrow",
      rhythm: "generous",
      rule: "none",
      headingPlacement: "above",
      imagery: "inset",
    },
  },
};

export interface UserPalette {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

/**
 * Merge a user's saved palette over a template's defaults. Composition is
 * never user-overridable — that's the template's identity. Contrast is
 * repaired: if the user's text colour fails AA against their background,
 * we fall back to the template's ink rather than shipping unreadable text
 * on someone's business card.
 */
export function resolveTheme(
  templateId: string,
  palette: UserPalette | undefined
): TemplateTheme {
  const base =
    TEMPLATE_THEMES[(templateId as TemplateId)] ?? TEMPLATE_THEMES.editorial;
  if (!palette) return base;

  const background = palette.backgroundColor || base.colors.background;
  const requestedInk = palette.textColor || base.colors.ink;
  const ink = meetsAA(requestedInk, background) ? requestedInk : base.colors.ink;
  const inkSoft = meetsAA(base.colors.inkSoft, background)
    ? base.colors.inkSoft
    : ink;

  return {
    ...base,
    colors: {
      ...base.colors,
      background,
      ink,
      inkSoft,
      accent: palette.primaryColor || base.colors.accent,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/templates/theme.test.ts`
Expected: PASS — 7 tests. If a contrast assertion fails, adjust that template's `ink`/`inkSoft` hex until it clears AA. Do **not** relax the assertion.

- [ ] **Step 5: Extract the 15 sections**

Read `components/templates/Editorial.tsx` in full first. It defines exactly these 15 functions, each with a signature already identical across all three template files:

`HeroSection`, `AboutSection`, `CertificationSection`, `EducationSection`, `TechStackSection`, `ServicesSection`, `ExperienceSection`, `ProjectsSection`, `InlineProjectsSection`, `ProductsSection`, `PropertyListingsSection`, `TestimonialsSection`, `GallerySection`, `ContactSection`.
(That is 14 named sections; `Projects` composes `InlineProjectsSection` + `ProjectsSection`, making 15 functions total.)

Create one file per section under `components/templates/sections/`, e.g. `components/templates/sections/HeroSection.tsx`. Each exports a single named component whose props are `{ theme: TemplateTheme }` **plus** the data it already received. Replace the old `theme: TemplateProps["data"]["theme"]` prop with the richer `theme: TemplateTheme` from `./theme`.

Inside each section, replace hardcoded values as follows:
- Every `style={{ color: theme.textColor }}` → `style={{ color: theme.colors.ink }}`
- Every muted-text `${theme.textColor}60` / `opacity-60` pattern → `style={{ color: theme.colors.inkSoft }}`
- Every `backgroundColor: COLORS.surface` → `theme.colors.surface`
- Every `fontFamily: "'X', sans-serif"` string → `fontFamily: \`var(${theme.fontVars.display})\`` (display) or `var(${theme.fontVars.body})` (body)
- Every `max-w-md mx-auto` → the measure helper below
- Every arbitrary radius → `var(--r-sm|md|lg)`

Add a shared helper in `components/templates/sections/measure.ts`:

```typescript
import { TemplateTheme } from "../theme";

/** Content width class for a template's chosen measure. */
export function measureClass(theme: TemplateTheme): string {
  switch (theme.composition.measure) {
    case "narrow":
      return "max-w-md mx-auto px-6";
    case "wide":
      return "max-w-2xl mx-auto px-6";
    case "full":
      return "w-full px-6 md:px-12";
  }
}

/** Vertical rhythm class for a template's chosen cadence. */
export function rhythmClass(theme: TemplateTheme): string {
  switch (theme.composition.rhythm) {
    case "tight":
      return "py-10 md:py-14";
    case "generous":
      return "py-14 md:py-20";
    case "cinematic":
      return "py-20 md:py-32";
  }
}
```

Every section wrapper uses `className={\`${measureClass(theme)} ${rhythmClass(theme)}\`}` instead of a hardcoded `max-w-md mx-auto px-6 py-10`.

`HeroSection` additionally branches on `theme.composition.hero` to render one of the three architectures (`editorial-stack` / `full-bleed-portrait` / `structured-split`). This is the single most important composition difference — implement all three variants; do not render the same markup for all three.

- [ ] **Step 6: Implement `components/templates/ProfileRenderer.tsx`**

```tsx
"use client";

import { Fragment, ReactNode } from "react";
import { ProfileData } from "@/types/profile";
import { resolveTheme } from "./theme";
import { measureClass } from "./sections/measure";
import { HeroSection } from "./sections/HeroSection";
import { AboutSection } from "./sections/AboutSection";
import { CertificationSection } from "./sections/CertificationSection";
import { EducationSection } from "./sections/EducationSection";
import { TechStackSection } from "./sections/TechStackSection";
import { ServicesSection } from "./sections/ServicesSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { InlineProjectsSection } from "./sections/InlineProjectsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { PropertyListingsSection } from "./sections/PropertyListingsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { GallerySection } from "./sections/GallerySection";
import { ContactSection } from "./sections/ContactSection";

export function ProfileRenderer({
  data,
  templateId,
}: {
  data: ProfileData;
  templateId: string;
}) {
  const {
    agent,
    projects,
    ownerId,
    products,
    propertyListings,
    inlineProjects,
    componentOrder,
    resolvedImages,
  } = data;

  const theme = resolveTheme(templateId, {
    primaryColor: data.theme.primaryColor,
    backgroundColor: data.theme.backgroundColor,
    textColor: data.theme.textColor,
    secondaryColor: data.theme.secondaryColor,
    accentColor: data.theme.accentColor,
  });

  const sections: Record<string, () => ReactNode> = {
    Hero: () => <HeroSection agent={agent} theme={theme} resolvedImages={resolvedImages} />,
    About: () => <AboutSection agent={agent} theme={theme} />,
    Certification: () =>
      agent.certification ? <CertificationSection certification={agent.certification} theme={theme} /> : null,
    Education: () =>
      agent.education?.length ? <EducationSection education={agent.education} theme={theme} /> : null,
    TechStack: () =>
      agent.techStack?.length ? <TechStackSection techStack={agent.techStack} theme={theme} /> : null,
    Services: () =>
      agent.services?.length ? <ServicesSection services={agent.services} theme={theme} /> : null,
    Experience: () =>
      agent.experience?.length ? <ExperienceSection experience={agent.experience} theme={theme} /> : null,
    Projects: () => (
      <>
        {inlineProjects?.length ? <InlineProjectsSection inlineProjects={inlineProjects} theme={theme} /> : null}
        {projects?.length ? <ProjectsSection projects={projects} theme={theme} resolvedImages={resolvedImages} /> : null}
      </>
    ),
    Products: () => (products?.length ? <ProductsSection products={products} theme={theme} /> : null),
    Properties: () =>
      propertyListings?.length ? <PropertyListingsSection propertyListings={propertyListings} theme={theme} /> : null,
    Testimonials: () =>
      agent.testimonials?.length ? <TestimonialsSection testimonials={agent.testimonials} theme={theme} /> : null,
    Gallery: () => (agent.gallery?.length ? <GallerySection gallery={agent.gallery} theme={theme} resolvedImages={resolvedImages} /> : null),
    Contact: () => <ContactSection theme={theme} ownerId={ownerId} />,
  };

  const order = componentOrder?.length ? componentOrder : Object.keys(sections);

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.ink,
        fontFamily: `var(${theme.fontVars.body})`,
      }}
    >
      {order.map((id) => (
        <Fragment key={id}>{sections[id]?.()}</Fragment>
      ))}
    </div>
  );
}

export { measureClass };
```

- [ ] **Step 7: Rewire callers and delete the old templates**

In `app/p/[id]/page.tsx`: delete the `TEMPLATE_COMPONENTS` map and the three template imports; render `<ProfileRenderer data={data} templateId={layoutConfig.themeId} />`.

In `app/dashboard/builder/page.tsx`: delete the three template imports and the `switch (selectedTemplate)` in `renderPreview`; render `<ProfileRenderer data={data} templateId={selectedTemplate} />`.

In `components/templates/registry.ts`: replace the hand-written `TEMPLATES` metadata array with one derived from `TEMPLATE_THEMES` so name/description/colors have a single source of truth. Delete `loadTemplate()` and `getDefaultTemplate()` (both are dead — nothing calls them). Keep `getTemplateMeta(id)`.

Then delete the four dead files:

```bash
git rm components/templates/Editorial.tsx components/templates/Kinetic.tsx components/templates/Architectural.tsx components/templates/Default.tsx
```

- [ ] **Step 8: Verify the line-count win and run everything**

Run: `npx vitest run && npm run build`
Expected: both pass. Then confirm the reduction:

```bash
find components/templates -name "*.tsx" -o -name "*.ts" | xargs wc -l | tail -1
```
Expected: total well under 1,400 lines (down from 2,687 for the three template files alone). Report the actual number.

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Open a public profile and switch the profile's template in the builder between all three. Confirm: (a) each template renders without error, (b) **the three look genuinely different in layout, not just colour** — different hero architecture, different content width, different rhythm, (c) fonts differ visibly between templates, (d) section reorder and hide/show still work (this behaviour was fixed in a prior audit — it must not regress). Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add -A components/templates types/profile.ts app/p app/dashboard/builder
git commit -m "refactor(templates): one renderer + theme descriptors, 2687 -> ~950 lines, real per-template fonts"
```

---

## Task 3: Public profile — server render, vanity slugs, metadata, OG images

**Files:**
- Modify: `convex/schema.ts` (add `slug` to `profiles` + index)
- Modify: `convex/profiles.ts` (slug generation, `getProfileBySlug`)
- Create: `app/[slug]/page.tsx` (vanity route)
- Modify: `app/p/[id]/page.tsx` (server component + metadata, kept for back-compat)
- Create: `app/p/[id]/opengraph-image.tsx`
- Test: `convex/profiles.test.ts` (append)
- Test: `lib/slug.test.ts`

**Interfaces:**
- Consumes: `<ProfileRenderer>` from Task 2.
- Produces: `slugify(name, suffix?)` in `lib/slug.ts`. `profiles.slug` (optional string, unique, indexed `by_slug`). `getProfileBySlug` query. Both `/p/<id>` and `/<slug>` render the same profile; `/p/<id>` remains permanently valid because it is printed on already-shipped cards.

**Why this task matters:** the audit found the public profile is a client component with zero `generateMetadata`, so every link shared to Messenger/Viber/LinkedIn previews as a naked URL — the one free viral loop a link-sharing product gets, switched off. And the URL printed on a premium card is a raw Convex document id.

- [ ] **Step 1: Write the failing slug test**

Create `lib/slug.test.ts`:

```typescript
import { expect, test } from "vitest";
import { slugify, isReservedSlug } from "./slug";

test("lowercases and hyphenates a name", () => {
  expect(slugify("Christian Raro")).toBe("christian-raro");
});

test("strips diacritics and punctuation", () => {
  expect(slugify("José  Ángel O'Brien-Smith!")).toBe("jose-angel-obrien-smith");
});

test("collapses repeated separators and trims them", () => {
  expect(slugify("  --Hello___World--  ")).toBe("hello-world");
});

test("appends a suffix when given", () => {
  expect(slugify("Christian Raro", "7f3")).toBe("christian-raro-7f3");
});

test("returns a stable fallback for input that slugifies to nothing", () => {
  expect(slugify("!!!")).toBe("profile");
});

test("caps length", () => {
  expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
});

test("reserved app routes are rejected as slugs", () => {
  for (const r of ["dashboard", "admin", "shop", "auth", "api", "p", "t"]) {
    expect(isReservedSlug(r), r).toBe(true);
  }
  expect(isReservedSlug("christian-raro")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/slug.test.ts`
Expected: FAIL — `./slug` does not exist.

- [ ] **Step 3: Implement `lib/slug.ts`**

```typescript
/** Route segments a profile slug may never occupy. */
const RESERVED = new Set([
  "p", "t", "api", "auth", "sign-in", "sign-up", "dashboard", "admin",
  "shop", "privacy", "terms", "pricing", "about", "contact", "support",
  "blog", "docs", "_next", "favicon.ico", "opengraph-image", "robots.txt",
  "sitemap.xml",
]);

export function isReservedSlug(candidate: string): boolean {
  return RESERVED.has(candidate.toLowerCase());
}

const MAX_LEN = 48;

export function slugify(input: string, suffix?: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const core = base || "profile";
  const withSuffix = suffix ? `${core}-${suffix}` : core;
  return withSuffix.slice(0, MAX_LEN).replace(/-+$/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/slug.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Add `slug` to the schema**

In `convex/schema.ts`, add `slug: v.optional(v.string()),` to the `profiles` table definition and append `.index("by_slug", ["slug"])` to its index chain. Additive only — existing profiles have no slug and must keep working via `/p/<id>`.

Run `npx convex codegen` (a 401 in this sandbox is expected and non-blocking).

- [ ] **Step 6: Write the failing slug-uniqueness test**

Append to `convex/profiles.test.ts`:

```typescript
test("createProfile assigns a unique slug derived from the profile name", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "slug_user_1" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "slug1@test.dev", clerkId: "slug_user_1", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const id = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "slug_user_1",
    name: "Christian Raro",
    agentInfo: {
      fullName: "Christian Raro", title: "Founder", company: "Herald",
      phone: "0917", email: "c@herald.ph", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"], heroStyle: "default",
    },
    featuredProperties: [],
  });

  const profile = await t.run(async (ctx) => ctx.db.get(id));
  expect(profile?.slug).toBeDefined();
  expect(profile?.slug).toMatch(/^christian-raro/);
});

test("a second profile with the same name gets a distinct slug", async () => {
  const t = convexTest(schema);
  for (const n of ["1", "2"]) {
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: `dup${n}@test.dev`, clerkId: `dup_user_${n}`, role: "agent",
        subscriptionStatus: "active", plan: "free",
      });
    });
  }
  const mk = (clerkId: string) =>
    t.withIdentity({ subject: clerkId }).mutation(api.profiles.createProfile, {
      clerkId,
      name: "Same Name",
      agentInfo: {
        fullName: "Same Name", title: "T", company: "C",
        phone: "0917", email: "s@test.dev", services: [], socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"], heroStyle: "default",
      },
      featuredProperties: [],
    });

  const a = await mk("dup_user_1");
  const b = await mk("dup_user_2");
  const [pa, pb] = await t.run(async (ctx) => [await ctx.db.get(a), await ctx.db.get(b)]);
  expect(pa?.slug).toBeDefined();
  expect(pb?.slug).toBeDefined();
  expect(pa?.slug).not.toBe(pb?.slug);
});

test("getProfileBySlug resolves the same profile as getProfile", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "bs_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "bs@test.dev", clerkId: "bs_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });
  const id = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "bs_user",
    name: "Bridget Solano",
    agentInfo: {
      fullName: "Bridget Solano", title: "Architect", company: "Solano",
      phone: "0917", email: "b@test.dev", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "architectural",
      colorPalette: { primary: "#1f3d5c", background: "#f7f8f9", text: "#16191c" },
      componentOrder: ["Hero"], heroStyle: "default",
    },
    featuredProperties: [],
  });
  const profile = await t.run(async (ctx) => ctx.db.get(id));
  const bySlug = await t.query(api.profiles.getProfileBySlug, { slug: profile!.slug! });
  expect(bySlug?._id).toBe(id);
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run convex/profiles.test.ts`
Expected: FAIL — no slug is assigned; `getProfileBySlug` does not exist.

- [ ] **Step 8: Implement slug assignment and lookup in `convex/profiles.ts`**

Import the helper: `import { slugify, isReservedSlug } from "../lib/slug";`

Add an internal helper that finds an unused slug, then call it in `createProfile` when inserting a NEW profile (not when patching an existing one, so a published URL never changes underneath a printed card):

```typescript
async function assignUniqueSlug(ctx: MutationCtx, name: string): Promise<string> {
  const base = slugify(name);
  const candidates = [
    base,
    ...Array.from({ length: 12 }, (_, i) =>
      slugify(name, Math.random().toString(36).slice(2, 5) + i)
    ),
  ];
  for (const candidate of candidates) {
    if (isReservedSlug(candidate)) continue;
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!taken) return candidate;
  }
  // Exhausted: fall back to something guaranteed free.
  return slugify(name, Date.now().toString(36));
}
```

In `createProfile`, in the insert branch only, add `slug: await assignUniqueSlug(ctx, args.name),` to `profileData`.

Add the public query, reusing the exact same enrichment `getProfile` performs (branding + `resolvedImages`) — extract that enrichment into a shared local function so the two queries cannot drift:

```typescript
export const getProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!profile) return null;
    return await enrichProfile(ctx, profile);
  },
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run convex/profiles.test.ts`
Expected: PASS — including the 2 pre-existing `resolvedImages` tests, which must not regress.

- [ ] **Step 10: Convert the public profile to a server component with metadata**

Split `app/p/[id]/page.tsx` into a server shell plus a client renderer:

- `app/p/[id]/page.tsx` becomes a **server component**. It uses Convex's `fetchQuery` (from `convex/nextjs`) to load the profile, exports `generateMetadata({ params })` returning real `title`, `description`, and `openGraph` fields built from the profile's name/title/company, and renders a small client child with the data.
- Create `app/p/[id]/ProfileView.tsx` (`"use client"`) containing the existing loading/not-found UI plus `<ProfileRenderer>`.
- Create `app/[slug]/page.tsx` mirroring the same structure but resolving via `getProfileBySlug`, returning `notFound()` when the slug is unknown so genuinely missing routes still 404.

`generateMetadata` shape:

```typescript
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await fetchQuery(api.profiles.getProfile, { profileId: id as Id<"profiles"> }).catch(() => null);
  if (!profile) return { title: "Profile not found — Herald" };
  const { fullName, title, company, about } = profile.agentInfo;
  const heading = [fullName, title].filter(Boolean).join(" — ");
  const description = about?.slice(0, 160) || [title, company].filter(Boolean).join(" at ") || `${fullName} on Herald`;
  return {
    title: `${heading} | Herald`,
    description,
    openGraph: { title: heading, description, type: "profile" },
    twitter: { card: "summary_large_image", title: heading, description },
  };
}
```

- [ ] **Step 11: Add the dynamic OG image**

Create `app/p/[id]/opengraph-image.tsx` using `next/og`'s `ImageResponse` at 1200×630. Render the person's name, title, company and the Herald wordmark on their template's background/ink colours (resolve via `resolveTheme(profile.layoutConfig.themeId, profile.layoutConfig.colorPalette)` from Task 2). Keep it to system-safe fonts inside the OG runtime — do not attempt to load the next/font instances there.

- [ ] **Step 12: Verify build and suite**

Run: `npm run build && npx vitest run`
Expected: both pass. In the build output, confirm `/p/[id]` is no longer listed as a purely static client route and that the `opengraph-image` route appears.

- [ ] **Step 13: Manual verification**

Run `npm run dev`. Then:
1. `curl -s http://localhost:3000/p/<a-real-profile-id> | grep -i "<title>\|og:title\|og:description"` — confirm real per-profile metadata is present **in the served HTML**, not injected later by JS.
2. Visit `http://localhost:3000/p/<id>/opengraph-image` and confirm a real 1200×630 image renders with the person's name.
3. Create a new profile in the builder, then visit `http://localhost:3000/<its-slug>` and confirm it renders identically to `/p/<id>`.
4. Visit `http://localhost:3000/definitely-not-a-real-slug` and confirm a 404, not a crash.
Stop the dev server.

- [ ] **Step 14: Commit**

```bash
git add -A convex lib/slug.ts lib/slug.test.ts app/p "app/[slug]"
git commit -m "feat(profile): server-render with real metadata, dynamic OG image, vanity slugs"
```

---

## Task 4: Rebrand every user-facing surface to Herald

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`, `components/DashboardLayout.tsx`, `app/dashboard/layout.tsx`, `convex/email.ts`, `app/shop/layout.tsx`, `README.md`, `.env.example`
- Test: `lib/brand.test.ts` (append)

**Interfaces:**
- Consumes: `HERALD` from `lib/brand.ts` (Task 1).
- Produces: zero occurrences of "Tapfolio"/"TapFolio" in user-visible strings.

- [ ] **Step 1: Write the failing no-stale-brand test**

Append to `lib/brand.test.ts`:

```typescript
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "docs", ".firecrawl", ".superpowers"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Built from fragments so this file does not match its own check.
const STALE_BRAND = new RegExp(["tap", "folio"].join(""), "i");

test("no user-facing source file still says the old brand name", () => {
  const selfPath = join("lib", "brand.test.ts");
  const offenders: string[] = [];
  for (const file of walk(process.cwd())) {
    const rel = file.replace(process.cwd(), "").replace(/^[\\/]/, "");
    if (rel === selfPath) continue;
    if (STALE_BRAND.test(readFileSync(file, "utf8"))) offenders.push(rel);
  }
  expect(offenders, `stale brand in:\n${offenders.join("\n")}`).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/brand.test.ts`
Expected: FAIL, listing every file still containing the old name.

- [ ] **Step 3: Replace the brand across those files**

Work through the failing list. Rules:
- User-visible copy → "Herald".
- `convex/email.ts` `from:` → `Herald <notifications@herald.ph>` **and** keep the existing `RESEND_API_KEY` guard. (Note: the audit found this address is a Resend *sandbox* sender that silently fails — replacing the display name does not fix delivery. Add a `// TODO(ops): verify herald.ph sending domain in Resend before launch; onboarding@resend.dev only delivers to the account owner.` comment directly above it.)
- `README.md` — replace the untouched `create-next-app` boilerplate with a real Herald README: what it is, prerequisites, `.env` setup, `npm i && npx convex dev && npm run dev`, how to run tests, how to deploy.
- `.env.example` — add the three missing vars the code actually reads: `RESEND_API_KEY`, `PAYREX_SECRET_KEY`, `PAYREX_WEBHOOK_SECRET`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/brand.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build and full suite**

Run: `npm run build && npx vitest run`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(herald): rebrand all user-facing surfaces, real README, complete .env.example"
```

---

## Deferred to the next plan (explicitly out of scope here)

Recorded so nobody mistakes these for oversights. The next plan covers, in order:

1. **Builder restructure** — the highest-frustration defect in the product: added entries (experience, projects, products, properties, testimonials) render as read-only text with a delete button, so fixing a typo means deleting and retyping every field. Plus: replace the 13 `fixed inset-0 z-[60]` modals with a side inspector (desktop) / bottom sheet (mobile) so the preview stays visible while editing, and give the five disconnected colour pickers contrast feedback using `meetsAA`.
2. **Landing page rebuild** under Herald, deleting the fabricated testimonials, the animated stat strip that counts to zero, and the "4 templates" claim (there are three).
3. **Dashboard shell** — token adoption, replacing ~500 raw palette classes, labelling the bottom-nav items that currently only show a label when active.
4. **Motion pass** — scroll-linked entrances for Kinetic (which today has exactly one transition in 984 lines, and it's a hover state on a page viewed on phones).
5. **Ops blockers from the audit** that are not design work but gate launch: `npm audit fix` for the critical `sanitize-html` XSS and the high-severity Clerk auth bypass; a real CI workflow; error tracking; `/privacy` and `/terms` routes; a production Clerk instance.
