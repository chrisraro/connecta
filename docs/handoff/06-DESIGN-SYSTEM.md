# Design System

As of commit `4116d50` on `main` (2026-08-21). Every claim below is derived
from source — `app/globals.css`, `lib/fonts.ts`, `components/templates/theme.ts`,
`components/templates/sections/**`, `components/ui/**`, `components.json`, `app/layout.tsx` — with
`file:line` citations. Where something could not be verified from source it is marked
`UNVERIFIED:`. See the companion Figma artifacts: `docs/handoff/figma/tokens.json` (W3C DTCG /
Tokens Studio) and `docs/handoff/figma/design-system-board.html` (html.to.design). Import steps for
both are at the bottom of this document.

This codebase enforces its scales narrowly and says so in its own comments:

> "SigmaTap — enforced scales. Exactly three radii, exactly two elevations."
> — `app/globals.css:96`

That philosophy — a handful of enforced primitives, everything else composed from them — is the
thread running through this whole document.

## Colour system

### Where colours live

`app/globals.css` defines every colour as a CSS custom property, authored in `oklch()`. There are
**118** `--name: value;` custom-property declarations in the file total (`:root`, `.dark`, and the
`@theme inline` Tailwind-mapping block combined; verified by counting `^\s*--[a-zA-Z0-9-]+:` matches
against the file). Three groups matter for design:

1. **Semantic theme tokens** (`--background`, `--foreground`, `--primary`, `--card`, `--border`,
   `--chart-1`..`--chart-5`, `--sidebar*`, etc.) — defined once in `:root` (`app/globals.css:60-113`,
   the **light** values) and redefined in `.dark` (`app/globals.css:116-159`, the **dark** values).
   These drive the app shell: dashboard, admin, shop, marketing pages, and every `components/ui/*`
   primitive.
2. **Brand tokens** (`--sigmatap-seal`, `--sigmatap-seal-hover`, `--sigmatap-ink`,
   `--sigmatap-ink-soft`, `--sigmatap-paper`, `--sigmatap-surface`, `--sigmatap-line` —
   `app/globals.css:103-113`) — **not** redefined inside `.dark`, so these are theme-invariant: the
   same seal red renders identically in light and dark mode. One saturated brand colour (the seal)
   plus warm neutrals tinted toward its hue, per the file's own comment (`app/globals.css:103-105`).
3. **Template colours** (`components/templates/theme.ts:47-117`) — the 3 profile-builder templates
   (Editorial, Kinetic, Architectural) carry their own hex-authored 6-colour palettes
   (`background`/`surface`/`ink`/`inkSoft`/`accent`/`line`), independent of the app-shell theme. A
   visitor's OS light/dark preference has no effect on a rendered public profile.

A full name → hex → oklch table for all three groups is in
`docs/handoff/figma/tokens.json` and rendered visually in
`docs/handoff/figma/design-system-board.html`.

### The light / dark / system triple, and how theming actually works

Theming is `next-themes` (`^0.4.6`, per `docs/handoff/02-TECH-STACK.md`), wired in
`components/ThemeProvider.tsx:6-11` (a thin passthrough) and configured at
`app/layout.tsx:55-60`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
```

- `attribute="class"` — the resolved theme is applied as a `.dark` (or absence of it) class on
  `<html>`, which is what `.dark { ... }` in `app/globals.css:115` selects against.
- `defaultTheme="dark"` — **this is a literal default, not "fall back to system if unset."** Reading
  `next-themes`' own source (`node_modules/next-themes/dist/index.mjs`, function `H`): the initial
  theme is `localStorage.getItem(storageKey) || defaultTheme`. There is no OS-preference resolution
  in that fallback path. A first-time visitor with an empty `localStorage` gets **dark**, full stop,
  regardless of their OS colour-scheme preference.
- `enableSystem` is on, but **no UI in this app ever calls `setTheme("system")`.** The only
  user-facing control is `components/ui/theme-toggle.tsx`, and both of its `setTheme` calls
  (`theme-toggle.tsx:19,31`) are a binary `theme === "dark" ? "light" : "dark"` — never `"system"`.
  So the "system" leg of the triple is _reachable in the library_ but _not exposed_ by this app: a
  visitor lands on dark, and from then on can only toggle explicitly between light and dark, with
  their choice persisted to `localStorage` (`next-themes` default key `"theme"`) and NOT re-derived
  from the OS on a later visit.
- Verified live: `https://sigmatap.vercel.app` served `<html class="... dark">` on first load
  (cross-check via a headless-browser fetch, no stored preference), consistent with the
  `defaultTheme="dark"` behaviour above.
- `components/ui/theme-toggle.tsx` also drives a circular-wipe transition using the View Transitions
  API (`document.startViewTransition`, `theme-toggle.tsx:30-52`) when the browser supports it and
  `prefers-reduced-motion` is not set — the matching `::view-transition-old/new(root)` rules live in
  `app/globals.css:493-509`.
- `components/ui/toaster.tsx:18` independently derives a `"light" | "dark" | "system"` prop for
  `sonner`'s own theming from the same `theme` value — this is the one place in the app that can
  literally pass `"system"` onward, but only as a pass-through of whatever `next-themes`' `theme`
  state already is (which, per above, is never `"system"` in practice here).

### Colour → CSS variable → Tailwind wiring

`app/globals.css`'s `@theme inline` block (`app/globals.css:6-55`) is what makes Tailwind v4 aware of
these custom properties as utility classes (`bg-background`, `text-foreground`, `border-border`,
etc.) — every `--color-*` entry there is a `var(--name)` indirection back to the `:root`/`.dark`
declarations above. Two of those mappings carry an explicit warning in the file itself
(`app/globals.css:9-15`): `--font-sans` and `--font-serif` **must** point at faces that are actually
loaded via `next/font` in `lib/fonts.ts`, or the whole app shell silently renders in the browser's
system fallback — call this out to anyone editing fonts.

### A known-odd value, left in place rather than "corrected"

`--destructive-foreground` (`app/globals.css:76`) is **byte-for-byte identical** to `--destructive`
(`app/globals.css:75`) — `oklch(0.577 0.245 27.325)` in light mode. That is not a conversion
artifact; it is what source says. In practice this token appears unused as an actual foreground
colour: `components/ui/button.tsx:13-14`'s `destructive` variant pairs `bg-destructive` with a
hardcoded `text-white`, not `text-destructive-foreground`. Dark mode does NOT repeat this — there,
`--destructive-foreground` (`app/globals.css:139`) correctly equals `--foreground`. Flagged here so
nobody "fixes" the light-mode value without checking every consumer first.

### Contrast enforcement on template colours

`components/templates/theme.ts`'s `resolveTheme()` (`theme.ts:147-198`) is the one place in this
codebase that actively repairs colour choices for accessibility. When a user picks a custom palette
for their public profile, `resolveTheme` checks every text-bearing colour (`ink`, `inkSoft`,
`accent`) against WCAG 2.1 AA (4.5:1, via `meetsAA`/`contrastRatio` in `lib/brand.ts:79-91`) against
**both** `background` and `surface` (six sections render on `surface`, not `background` —
`theme.ts:143-145`), and falls back to the template's default colour if a user's choice would fail.
`surface`/`line` are also re-derived (`mixHex`, `lib/brand.ts:93-101`) when a user's background shifts
far enough in luminance from the template default (`MATERIAL_LUMINANCE_SHIFT = 0.3`, `theme.ts:132`)
that the template's preset surface/line would otherwise look stale or unreadable.

## Typography

### The 6 font families and the per-template mechanism

All 6 families are loaded once via `next/font/google` in `lib/fonts.ts:1-59` and applied as CSS
variables on `<html>` through `allFontVariables` (`lib/fonts.ts:52-59`, consumed at
`app/layout.tsx:52`) — **never loaded per-component.** `display: "swap"` is set on every one.

| CSS variable               | Family                                         | `lib/fonts.ts` | Role                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--font-display`           | Fraunces (variable, axes `SOFT`/`WONK`/`opsz`) | `:11-16`       | SigmaTap's own marketing/legal display face — `app/page.tsx:108,411`, `components/legal/LegalPage.tsx:56,63`. Never used inside a rendered profile.                                                                |
| `--font-body`              | Geist                                          | `:19-23`       | App-wide UI/body face, mapped to Tailwind's `--font-sans` (`app/globals.css:16`) — "Serif is banned on dashboard surfaces" (`lib/fonts.ts:18`). **Also** the body face inside all 3 profile templates (see below). |
| `--font-mono`              | Geist Mono                                     | `:25-29`       | Order numbers, SKUs, audit entries across admin/shop tables (16 files reference `font-mono`, e.g. `app/admin/shop/orders/page.tsx`).                                                                               |
| `--font-tpl-editorial`     | Newsreader                                     | `:33-37`       | Editorial template's display/heading face. Also reused app-wide as Tailwind's `--font-serif` (`app/globals.css:17`), so any incidental `font-serif` utility elsewhere in the app resolves to this face too.        |
| `--font-tpl-kinetic`       | Space Grotesk                                  | `:39-43`       | Kinetic template's display/heading face.                                                                                                                                                                           |
| `--font-tpl-architectural` | Manrope                                        | `:45-49`       | Architectural template's display/heading face.                                                                                                                                                                     |

**The mechanism:** each template's identity is "primarily typographic"
(`components/templates/ProfileRenderer.tsx:26`). `components/templates/theme.ts`'s `fontVars`
(`TemplateFontVars`, `theme.ts:32-36`) names a `display` variable per template and, notably, **the
same `body: "--font-body"` for all three** (`theme.ts:61,84,107`) — only the heading/display face
changes between templates; body copy is Geist everywhere, on the marketing site and inside every
profile. Section components consume the theme's fonts directly via inline style, e.g.
`components/templates/sections/HeroSection.tsx:112`:
`style={{ fontFamily: `var(${theme.fontVars.display})`, ... }}`. This is why the comment at
`app/globals.css:9-15` calls font mapping "exactly Task 1's bug class" — if a `--font-tpl-*` variable
were ever renamed in `lib/fonts.ts` without updating `theme.ts`'s `fontVars`, that template would
silently fall back to the browser default with no error.

One non-obvious wiring detail, verified empirically: `--font-mono` is **not** remapped in the
`@theme inline` block (unlike `--font-sans`/`--font-serif`, which explicitly are —
`app/globals.css:16-17`), yet the Tailwind `font-mono` utility still resolves to the real loaded
Geist Mono face rather than a system stack. This works because Tailwind v4's own built-in default
theme token happens to share the exact name `--font-mono`
(`node_modules/tailwindcss/theme.css:6`), so the `next/font` custom property is picked up by
cascade without any explicit SigmaTap-authored mapping. Confirmed on the live production site: a
freshly created `<span class="font-mono">` computed to `"Geist Mono", "Geist Mono Fallback"`.

### Type scale

`app/globals.css` defines no `--text-*` custom properties, and this repo has no `tailwind.config.*`
file (`components.json:7` even has an empty `"config": ""`). **UNVERIFIED as a SigmaTap-authored
scale** — every `text-*` utility class in this codebase (`text-xs` through `text-9xl`) is Tailwind
v4's own shipped default, confirmed by reading `node_modules/tailwindcss/theme.css:299-324` directly:

| Utility     | Size            | Line height |
| ----------- | --------------- | ----------- |
| `text-xs`   | 0.75rem (12px)  | 1rem        |
| `text-sm`   | 0.875rem (14px) | 1.25rem     |
| `text-base` | 1rem (16px)     | 1.5rem      |
| `text-lg`   | 1.125rem (18px) | 1.75rem     |
| `text-xl`   | 1.25rem (20px)  | 1.75rem     |
| `text-2xl`  | 1.5rem (24px)   | 2rem        |
| `text-3xl`  | 1.875rem (30px) | 2.25rem     |
| `text-4xl`  | 2.25rem (36px)  | 2.5rem      |
| `text-5xl`  | 3rem (48px)     | 1           |
| `text-6xl`  | 3.75rem (60px)  | 1           |
| `text-7xl`  | 4.5rem (72px)   | 1           |
| `text-8xl`  | 6rem (96px)     | 1           |
| `text-9xl`  | 8rem (128px)    | 1           |

Real usage varies per hero layout rather than following a fixed hierarchy — e.g.
`HeroSection.tsx`'s three hero variants use `text-4xl` (editorial-stack name, `:111`), `text-5xl
md:text-6xl` (full-bleed-portrait name, `:172`), and `text-2xl` (structured-split name, `:229`) for
what is semantically the same element (the profile owner's name), because each template's
`composition.hero` architecture calls for different type weight at that position.

## Spacing

`app/globals.css` has no `--spacing` override, so every `p-*`/`m-*`/`gap-*` utility is a multiple of
Tailwind v4's single default spacing unit, `--spacing: 0.25rem` (`node_modules/tailwindcss/theme.css:277`,
un-overridden). Not a SigmaTap-specific token. The one place a _semantic_ spacing decision is
made is per-template `rhythm` (vertical section spacing) — see below.

## Composition: how templates differ beyond colour

Colour is deliberately not what makes the three templates distinct (`ProfileRenderer.tsx:26`:
"Composition — not colour — is what makes the three templates distinct"). Each `TemplateTheme`
carries a `composition` object (`theme.ts:8-21`) with 6 independent axes, resolved into layout
classes by `components/templates/sections/measure.ts` and `.../imagery.ts`:

| Axis               | Editorial                    | Kinetic                  | Architectural               |
| ------------------ | ---------------------------- | ------------------------ | --------------------------- |
| `hero`             | editorial-stack              | full-bleed-portrait      | structured-split            |
| `measure`          | wide (`max-w-2xl`)           | full (`w-full`)          | narrow (`max-w-md`)         |
| `rhythm`           | cinematic (`py-20 md:py-32`) | tight (`py-10 md:py-14`) | generous (`py-14 md:py-20`) |
| `rule`             | hairline                     | numbered                 | none                        |
| `headingPlacement` | beside                       | above                    | above                       |
| `imagery`          | bleed                        | masonry                  | inset                       |

`SectionShell.tsx` (`components/templates/sections/SectionShell.tsx:35-114`) is the shared frame
every content section renders through — it owns background alternation (`surface` vs `background`
per section), the measure/rhythm wrapper, the section's rule style (hairline border, numbered tag,
or nothing), and heading placement. The numbered-tag sequence itself is computed by
`resolveSectionSlots` (`components/templates/sectionSlots.ts:51-70`), which counts only slots that
both have content **and** display a number — fixing a real bug class documented in its own comment
(`sectionSlots.ts:6-19`): hidden/empty sections used to leave gaps in the numbering, and sections
without a `heading` (Hero, Certification) used to offset every section after them.

## Radii — `--r-*`

`app/globals.css:96-99`: **exactly three**, per the file's own comment.

| Token    | Value  | Example consumer                                                          |
| -------- | ------ | ------------------------------------------------------------------------- |
| `--r-sm` | `6px`  | `HeroSection.tsx:74` (social link chips), `imagery.ts:26` (gallery items) |
| `--r-md` | `12px` | `HeroSection.tsx:218` (structured-split avatar)                           |
| `--r-lg` | `20px` | `HeroSection.tsx:96` (editorial-stack avatar)                             |

Consumed as an arbitrary-value Tailwind class, `rounded-[var(--r-sm)]` etc. — not through the
generic `rounded-*` scale.

This is **distinct** from the Tailwind/shadcn radius scale also present in the same file
(`app/globals.css:48-54`): `--radius-sm` through `--radius-4xl` all derive via `calc()` from a
single `--radius: 0.5rem` (`app/globals.css:58`), and power the _generic_ `rounded-sm`/`rounded-md`/
etc. utilities used by shadcn primitives (buttons, cards, inputs) throughout the app shell. Two
radius systems coexist on purpose: `--r-*` is the enforced, minimal scale for profile-template
content; the shadcn scale is what `components/ui/**` primitives use out of the box.

## Elevation — `--e-*`

`app/globals.css:100-101`: **exactly two**.

| Token         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| `--e-raised`  | `0 1px 2px rgb(28 22 20 / 0.04), 0 2px 8px rgb(28 22 20 / 0.06)`    |
| `--e-overlay` | `0 4px 12px rgb(28 22 20 / 0.08), 0 12px 32px rgb(28 22 20 / 0.12)` |

Applied via inline `style`, not a Tailwind utility — e.g.
`HeroSection.tsx:97`: `style={{ backgroundColor: theme.colors.surface, boxShadow: "var(--e-raised)" }}`
on the editorial-stack avatar frame.

## Component inventory

### `components/ui/**` — 27 files

shadcn "new-york" style (`components.json:3`), `baseColor: "neutral"`, CSS variables enabled
(`components.json:6-12`), icon library `lucide` (`components.json:13`). Aliased import paths:
`@/components`, `@/components/ui`, `@/lib`, `@/hooks` (`components.json:14-20`).

Radix-backed primitives (thin wrappers): `alert-dialog.tsx`, `checkbox.tsx`, `dialog.tsx`,
`dropdown-menu.tsx`, `label.tsx`, `select.tsx`, `sheet.tsx`, `switch.tsx`, `tabs.tsx`.

`class-variance-authority` (`cva`) variant components: `alert.tsx` (`default`/`destructive`),
`badge.tsx` (`default`/`secondary`/`destructive`/`outline`), `button.tsx` (`default`/`destructive`/
`outline`/`secondary`/`ghost`/`link` × `default`/`xs`/`sm`/`lg`/`icon`/`icon-xs`/`icon-sm`/`icon-lg`,
`button.tsx:7-39`), `tabs.tsx` (`default`/`line`).

Plain composable primitives: `card.tsx` (`Card`/`CardHeader`/`CardTitle`/`CardDescription`/
`CardAction`/`CardContent`/`CardFooter`), `form.tsx` (`FormItem`/`FormLabel`/`FormControl`/
`FormDescription`/`FormMessage`), `input.tsx`, `textarea.tsx`, `table.tsx`, `skeleton.tsx`.

SigmaTap-authored (no shadcn/Radix origin): `DigitalCardModal.tsx`, `digital-business-card.tsx`,
`empty-state.tsx`, `image-uploader.tsx`, `notifications-popover.tsx`, `reveal.tsx`,
`theme-toggle.tsx`, `tilt-card.tsx`, `toaster.tsx` (wraps `sonner`).

### `components/templates/**` — 3 templates, 15 section files

Templates: Editorial, Kinetic, Architectural (`components/templates/theme.ts:3`, `TEMPLATE_IDS`).
`components/templates/registry.ts` is a thin metadata layer over `theme.ts` (gradient thumbnail,
`bestFor` audience list per template, `registry.ts:22-26`) — `theme.ts` remains the single source of
truth for colours/fonts/composition.

Section components (`components/templates/sections/`, 15 files): `SectionShell.tsx` (shared frame,
not itself a content section) plus 14 renderable sections — `AboutSection`, `CertificationSection`,
`ContactSection`, `EducationSection`, `ExperienceSection`, `GallerySection`, `HeroSection`,
`InlineProjectsSection`, `ProductsSection`, `ProjectsSection`, `PropertyListingsSection`,
`ServicesSection`, `TechStackSection`, `TestimonialsSection`. `ProjectsSection` and
`InlineProjectsSection` are siblings that both fan out from the single `Projects` entry in a
profile's `componentOrder` (`ProfileRenderer.tsx:124-139`).

`ProfileRenderer.tsx` (`components/templates/ProfileRenderer.tsx:29-206`) is the single entry point
that replaced three separate per-template files (`Editorial.tsx`/`Kinetic.tsx`/`Architectural.tsx`,
"2,687 combined lines, one design copy-pasted three times" — `ProfileRenderer.tsx:24-27`).

## Hard-won layout rules

These are real, previously-shipped bugs, each with a measured repro in the commit history. A new
designer/developer will re-break these unless they know about them going in.

### 1. Flex children need `min-w-0` — `truncate`/`line-clamp` are inert without it

CSS flex items default to `min-width: auto`, which means a flex child never shrinks below its
content's intrinsic width — `truncate` (which needs `overflow: hidden` + a _constrained_ width to do
anything) silently has no effect until every flex ancestor in the chain is given `min-w-0`.

Real example, `app/dashboard/leads/page.tsx:237-256`, with the bug documented inline:

```tsx
{/* The `truncate` on the contact below only works if every flex ancestor can
    shrink. Without min-w-0 they each sit at min-width:auto, so a long email
    widened the whole card to ~423px inside a 320px [viewport] ... */}
<div className="flex justify-between items-start gap-3 mb-4">
  <div className="flex min-w-0 items-center gap-3">
    ...
    <div className="min-w-0">
      <h3 className="truncate font-black uppercase tracking-tight text-foreground">{lead.inquirerName}</h3>
      <div className="flex min-w-0 items-center gap-2 text-[10px] ...">
```

Every flex ancestor between the scroll container and the truncating element needs `min-w-0` — one
missed link in the chain and the whole thing silently stops working, with no error, no lint warning,
just an overflowing card in a real browser. `app/dashboard/builder/page.tsx:1576-1582` documents a
second, independently-discovered instance of the same failure mode (measured: a modal row hit
`scrollWidth 441` inside a 286px modal, pushing a delete button 86px past the viewport, because a URL
with no break opportunity had nowhere to shrink to without `min-w-0`).

### 2. Capped Convex queries need `.order()` or they freeze on the oldest rows

A `.take(N)` (or any bounded `.collect()`) on an unordered `ctx.db.query(...)` defaults to
**ascending insertion order** — meaning a capped query silently returns the same oldest `N` rows
forever once the table exceeds the cap, and newly created rows can never enter the result set at
all. This is load-bearing enough that it's called out inline at the two admin list endpoints that
hit it, `convex/admin.ts:327-332`:

```ts
// .order("desc") is load-bearing: a full-table scan defaults to
// ascending insertion order, so an unordered .take(CAP) would return the
// SAME oldest CAP rows forever once the table exceeds the cap — newly
// created users could never enter the list. Descending order makes the
// cap drop the least-useful (oldest) rows instead.
const users = await ctx.db.query("users").order("desc").take(ADMIN_USER_LIST_CAP);
```

and again at `convex/admin.ts:392-394` for `cards`. The same pattern — `.order("desc")` immediately
before a bound — recurs deliberately across the codebase: `convex/shop.ts:57-68` (with its own
explanatory comment), plus `notifications.ts:13`, `projects.ts:26`, `audit.ts:48,70`,
`checkout.ts:499`, `billing.ts:116`, `leads.ts:190`, `teams.ts:341`. Any new capped query needs the
same treatment, and it is easy to miss because the code runs fine and looks correct in dev with a
small table — the bug only manifests once a table grows past the cap.

### 3. `overflow-x: clip` on `html`/`body` makes `documentElement.scrollWidth` useless as an overflow detector

`app/globals.css:178-180` sets `html, body { overflow-x: clip; }` deliberately, in place of
Tailwind's `overflow-x-hidden` (`overflow-x: hidden`) — the file's own comment
(`app/globals.css:162-177`) explains why: `hidden` on only one axis makes the browser silently
compute the _other_, unset axis as `auto` too (the CSS "mismatched axis" quirk), which turns `body`
into an unintended scroll container and breaks every `position: sticky` descendant. `clip` is exempt
from that quirk and never creates a scroll container, so it was the correct fix for that bug
(commit `209f57b`).

The side effect — verified empirically in this task, not asserted from the comment above — is that
`overflow: clip` does not establish a **scrollable overflow region** at all (per the CSS Overflow
spec, only `auto`/`scroll`/`hidden` do). That means `document.documentElement.scrollWidth`, a common
manual "is there horizontal overflow?" check, stops reflecting real content overflow once `clip` is
in effect on `<html>`:

```
Test page: html, body { overflow-x: clip }, one 2000px-wide child, 800px viewport.
document.documentElement.scrollWidth  -> 800   (WRONG — reports no overflow)
document.documentElement.clientWidth  -> 800
document.body.scrollWidth             -> 2000  (correct — body itself is not the element being clipped by its own ancestor)
```

Forcing `document.documentElement.style.overflowX = "visible"` before measuring restores the correct
`scrollWidth` (2000, matching the actual overflowing content) in the same test. **Practical rule:
measure `document.body.scrollWidth`, or temporarily force `overflow-x: visible` on `<html>` before
measuring, when manually checking for horizontal overflow in this codebase — `documentElement.scrollWidth`
alone will report false negatives.** Earlier audit passes (`.superpowers/sdd/task-2-fixes-report.md`,
`.superpowers/sdd/mobile-polish-report.md`) used `documentElement.scrollWidth === clientWidth` as
their overflow check; that check still incidentally read correctly in those reports because both
sides collapse to the viewport width together under `clip` — it happens to still catch a _false_
"equal" reading, but it can no longer catch a _real_ overflow the way it could before `clip` was
introduced, which is the trap for a future check that assumes it can.

## Importing these artifacts into Figma

`.fig` is a proprietary binary format — it cannot be generated by tooling, and Figma's REST API
cannot create files. These two artifacts use the two supported paths instead:

### `tokens.json` → Tokens Studio

1. Install the **Tokens Studio for Figma** plugin from the Figma Community.
2. Open it on a Figma file, go to Settings → Import, choose "Load from file / folder", and select
   `docs/handoff/figma/tokens.json`.
3. All colours are hex (Tokens Studio does not parse `oklch()` — see "How the oklch → hex conversion
   was verified" below). Radii are `dimension` tokens, elevations are `shadow` tokens, font families
   are `fontFamily` tokens. Apply the token set to styles/variables from the plugin's Apply tab.

### `design-system-board.html` → html.to.design

1. Install the **html.to.design** plugin from the Figma Community.
2. Use its "Import from file" option (not "Import from URL") and select
   `docs/handoff/figma/design-system-board.html` — it is fully self-contained (inline CSS, no
   external requests, no CDN fonts), so it imports without needing network access from the plugin.
3. It arrives as editable Figma layers: colour swatches, the type scale, radii, elevations, and the
   component inventory, each as real text nodes and shapes.
4. The page can also be opened directly in any browser to sanity-check it before import — verified in
   this task with a full-page screenshot via the Playwright Chromium binary
   (`ms-playwright/chromium-1228/chrome-win64/chrome.exe --headless --screenshot`); every section
   (colour groups, template table, type scale, font cards, radii, elevations, both inventory columns)
   rendered correctly with no missing content, no external-resource errors, and no layout breakage
   through the full document height.

### How the oklch → hex conversion was verified

Every colour in `tokens.json` and `design-system-board.html` is authored in `oklch()` in source.
Converting to hex used the canonical CSS Color 4 OKLab → linear-sRGB matrices (not a guess or an
online tool) run through Node directly against every token value. Sanity checks against known
reference points passed exactly before converting real tokens: `oklch(1 0 0)` → `#ffffff`,
`oklch(0 0 0)` → `#000000`, `oklch(0.6 0 0)` → `#808080`. Two dark-mode chart colours
(`--chart-4`, `--chart-5`) are outside the sRGB gamut at full oklch precision and were gamut-clipped
during conversion — flagged individually in `tokens.json`'s `$description` for those two tokens
rather than silently rounded. `tokens.json` was verified to `JSON.parse` cleanly and every `$type:
"color"` token's `$value` was regex-checked against `^#[0-9a-fA-F]{6}$` (89/89 passed) — see the
report for this task for the exact verification transcript.

(Note: an attempt to cross-check the hex conversion by rendering `oklch()` directly in a
Chromium-based browser and reading back `getComputedStyle` was inconclusive — the available headless
Chromium build serialized computed custom-property values as the literal `oklch(...)` string rather
than a resolved `rgb()`/`lab()` value, so it could not be used as an independent conversion check.
The math-based conversion above, validated against known black/white/grey references, was used
instead.)

## Cross-check against the live deployment

Per this task's brief, source is authoritative — the app has never been scraped to author any value
in this document. As an additional cross-check (not a source of truth), a live fetch of
`https://sigmatap.vercel.app` confirmed:

- `<html>` carries the `dark` class with no stored theme preference — consistent with
  `defaultTheme="dark"` (see "The light / dark / system triple" above).
- Computed `--r-sm`/`--r-md`/`--r-lg` were exactly `6px`/`12px`/`20px`, and `--e-raised` computed to
  `0 1px 2px #1c16140a, 0 2px 8px #1c16140f` — `rgb(28 22 20)` is `#1c1614`; the hex-alpha
  suffixes match `0.04`→`0a` and `0.06`→`0f` at 8-bit precision. Matches source exactly.
- The live site's computed `--background`/`--foreground` serialized as `lab(...)` rather than
  `oklch(...)` — this is the browser's own colorimetric renormalization of the identical oklch
  value into another equivalent colour-space notation (`getComputedStyle` on a custom property can
  return a computed/normalized serialization rather than the literal authored string), not a
  discrepancy from source.

No discrepancies requiring reconciliation were found.

## UNVERIFIED

- **Type scale as a deliberate SigmaTap decision**: confirmed to be Tailwind v4's unmodified
  default (`node_modules/tailwindcss/theme.css:299-324`) — there is no evidence in `app/globals.css`
  or the absent `tailwind.config.*` that this scale was ever intentionally authored versus simply
  inherited. Documented here as "what the codebase actually renders," not as a SigmaTap-original
  scale.
- **Spacing scale**: same status — Tailwind v4's default `--spacing: 0.25rem`
  (`node_modules/tailwindcss/theme.css:277`), un-overridden, not a SigmaTap-specific token.
- **Whether `--destructive-foreground` being identical to `--destructive` in light mode is a bug or
  intentional**: flagged above with its one real consumer traced (`button.tsx:13-14` does not use
  it), but no commit history or comment explains the intent either way.
- **oklch → hex conversion, browser cross-check**: as noted above, the available headless-Chromium
  build did not resolve `oklch()` to `rgb()`/`lab()` via `getComputedStyle` for a locally-authored
  test page, so the conversion could only be cross-checked against known black/white/grey reference
  points and the live-site `--e-raised`/`--r-*` comparison, not against a full oklch→rgb browser
  round-trip for every token.
