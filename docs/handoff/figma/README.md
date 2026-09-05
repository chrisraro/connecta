# The design artifacts in Figma

**These now exist as live, native Figma files.** The SVG/JSON/HTML exports in
this folder are kept as the offline, version-controlled source of truth — but
you almost certainly want the links first.

| What                         | Link                                                |
| ---------------------------- | --------------------------------------------------- |
| Diagrams (FigJam)            | https://www.figma.com/board/CEvkzFpxmc8WELLBQMH2ZN  |
| Design system (Figma Design) | https://www.figma.com/design/jIGbCViAJZt2FFye1KkF7C |

### What is in the FigJam board

Four diagrams, generated from the same Mermaid sources as the SVGs in this
folder, but as real editable FigJam shapes and connectors — not flat vectors:

- **SigmaTap — Data Model (ERD)** — all 20 tables, keys, cardinality, and the
  dead fields called out inline so nobody builds on them.
- **NFC Card Lifecycle** — admin factory → tap/scan → claim → activation.
- **Auth, Onboarding and First Profile** — including the admin split and the
  plan gate.
- **Lead Capture and Shop** — including the offline queue and the
  `PAYMENTS_ENABLED` placeholder branch.
- **Sitemap: Public, Auth and Shop** — the public, auth, shop and API routes.
- **Sitemap: Dashboard and Admin** — the authenticated routes on both sides of
  the admin split.

The sitemap is two diagrams rather than one because 42 routes in a single
flowchart stops being readable; the split is by authentication boundary.

### What is in the Design file

Built directly from `app/globals.css`, `components/templates/theme.ts`,
`lib/fonts.ts` and `components/ui/**` — not from a screenshot, and not from
this folder's `tokens.json`.

- **113 variables** across 5 collections — Theme (64), Template (18),
  Typography (18), Brand (7), Radius (6). Every one has an explicit scope and
  Dev Mode code syntax (`var(--background)`, `TEMPLATE_THEMES.editorial.colors.ink`).
- **17 styles** — 15 text styles (font size and family bound to variables) and
  2 effect styles for `--e-raised` / `--e-overlay`.
- **Foundations page** — 89 colour swatches whose fills are _bound to the
  variables_, so the board cannot drift from the tokens; the type ramp in all
  six real families; radius and elevation samples.
- **Components page** — `Button` (24 variants), `Button Icon` (24),
  `Badge` (4), `Input` (5 states), `Card`. Fills, strokes and radii are
  variable-bound rather than hardcoded.

### Known limits of the current Figma files

These are Figma **Starter plan** limits, not modelling decisions. Each is a
small fix once the plan is upgraded:

1. **No light/dark mode switcher.** Multi-mode variable collections are a paid
   feature, so `light/` and `dark/` are variable _groups_ inside one
   collection rather than two modes. All 64 values are present and correct.
   Upgrading lets you add a second mode and move the `dark/` values into it.
2. **3 pages maximum.** One-page-per-component is not possible, so components
   share the Components page.
3. **MCP tool-call cap.** The build hit the Starter rate limit before the
   sitemap diagram and the cover page were finished. See "Still to do" below.

### Still to do in Figma

- A **cover page** for the Design file. The script is written and syntax-checked
  — [`cover-page.plugin.js`](./cover-page.plugin.js) — it just needs one
  `use_figma` call, or a paste into Figma's plugin console. It renders the title
  block, a contents summary, the plan constraints and the two known defects.
- Visual QA of `Button Icon`, `Badge`, `Input` and `Card` — they were created
  and their structure confirmed by the API's return values, but the tool-call
  cap hit before screenshots. Button, both foundations sections and all six
  FigJam diagrams _were_ visually verified.

The Starter tool-call cap refills slowly — roughly a couple of calls at a
time — so these are best finished in a session where the budget isn't already
spent, or after upgrading.

### Two real defects these files surfaced

Building the components from source rather than from a screenshot exposed two
things worth fixing in code:

1. **`Badge` variant `destructive` is unreadable in light mode.**
   `components/ui/badge.tsx` puts `text-destructive-foreground` on
   `bg-destructive`, and `app/globals.css:75-76` set both to the _same_
   `oklch(0.577 0.245 27.325)`. Red text on a red pill. The Figma component
   reproduces it faithfully rather than quietly correcting it.
2. **`Card` does not use the elevation tokens.** This design system defines
   exactly two elevations (`--e-raised`, `--e-overlay`), but
   `components/ui/card.tsx` uses Tailwind's `shadow-sm`. The shadcn primitives
   predate the elevation rule and were never migrated.

## Why there's no `.fig` file

To be precise about two different things that are easy to conflate:

- **Figma imports `.fig` fine.** It is Figma's own format; drag one in and
  it opens. That was never the problem.
- **Nothing outside Figma can _write_ one.** `.fig` is an undocumented
  proprietary binary, and Figma's REST API cannot create file content
  either. So there is no "export to .fig" step available to this repo.

## The better route: the Figma MCP server can write to the canvas directly

Since February 2026 Figma's official MCP server supports **write access**
("Code to canvas", built with Anthropic's Claude Code). An agent connected
to it can create and edit _native_ Figma content — frames, components,
variables, auto layout in Design files, and stickies/sections/connectors in
FigJam — using your design system as the source of truth.

That makes the whole file-format question moot: instead of importing a flat
SVG, the diagrams and tokens in this folder can be rebuilt as real, native,
editable Figma layers. This is strictly better fidelity than any import
path below.

Connect it (either works):

```bash
claude plugin install figma@claude-plugins-official      # recommended
claude mcp add --transport http figma https://mcp.figma.com/mcp --scope user
```

Then run `/mcp` in an interactive session, select `figma`, and complete the
OAuth prompt in the browser. Note the auth step is interactive — it cannot
be completed from a non-interactive/headless session.

Requirements and caveats, as of this writing:

- **Any seat** can create/edit files in **drafts**. Modifying an existing
  file **outside** drafts needs a **Full seat with edit permission**. Dev
  seats are read-only outside drafts.
- The write-to-canvas capability is in **beta**, currently free, and Figma
  has said it will become a **usage-based paid** feature.
- Verify the current state at
  <https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/>
  before relying on it — this moved once already and may move again.

The static artifacts below remain useful and require no plan, no seat, no
beta and no cost — keep them as the fallback.

## Files in this folder

| File                       | Import path           | Plugin/cost                              |
| -------------------------- | --------------------- | ---------------------------------------- |
| `erd.svg`                  | Drag/drop onto canvas | None, free                               |
| `user-flows.svg`           | Drag/drop onto canvas | None, free                               |
| `sitemap.svg`              | Drag/drop onto canvas | None, free                               |
| `tokens.json`              | Tokens Studio plugin  | Free plugin                              |
| `design-system-board.html` | html.to.design plugin | Free tier is limited; see fallback below |

## SVG diagrams — `erd.svg`, `user-flows.svg`, `sitemap.svg`

**Import steps:**

1. Open (or create) a Figma file, and open the canvas you want the diagram
   on.
2. Drag the `.svg` file from your file explorer directly onto the Figma
   canvas. (Alternatively: **File → Import…** or paste with `Ctrl+V` after
   copying the file.)
3. It arrives as an editable vector layer tree — every shape and every
   piece of text is a real, selectable Figma layer, not a flattened image.

This path always works — no plugin, no paid tier, no account beyond a
normal Figma login.

### The foreignObject trap — read this before regenerating these files

If you ever regenerate these diagrams from the Mermaid source in the `.md`
docs (`04-ERD.md`, `05-USER-FLOWS.md`), **do not just pipe Mermaid's raw
output through mermaid-cli and call it done.** Mermaid's default SVG output
renders every text label as a `<foreignObject>` element — literal HTML
(`<span>`, `<div>`) embedded inside the SVG via the `foreignObject` tag.
Browsers render `foreignObject` fine. **Figma's SVG importer does not
render `foreignObject` at all.** Import a raw Mermaid SVG and you get the
boxes, the arrows, and the connecting lines — with every single label
silently missing. It looks like an empty diagram skeleton, and nothing in
the import flow warns you about it.

The three files in this folder were post-processed specifically to avoid
this: every label was converted from a `<foreignObject>`-wrapped HTML
string into a real SVG `<text>` node. This was verified directly against
the files, not assumed:

- `erd.svg` — **0** `foreignObject` elements, **295** `<text>` nodes.
- `user-flows.svg` — **0** `foreignObject` elements, **85** `<text>` nodes.
- `sitemap.svg` — **0** `foreignObject` elements, **50** `<text>` nodes.

Each file was also visually confirmed by rendering it to PNG and checking
every label was actually present and legible, not just structurally
converted.

**If you regenerate any of these three files from the Mermaid source, you
must redo this foreignObject → `<text>` conversion, or the labels will
silently vanish the moment the file is imported into Figma.** A file that
merely "looks fine" opened in a browser is not sufficient evidence it's
safe for Figma — browsers happily render `foreignObject`; Figma's importer
is the thing that doesn't.

## `tokens.json` → Tokens Studio

W3C Design Tokens (DTCG) format. Verified: parses as valid JSON, contains
**89** colour (`$type: "color"`) values, and every one of those values is
hex or rgb — none are left as `oklch()`.

**Why the values were converted:** this codebase authors every colour in
`app/globals.css` as `oklch()` (see `06-DESIGN-SYSTEM.md`), but the Tokens
Studio plugin does not understand `oklch()` as a colour format. Every
colour token in `tokens.json` was converted to hex using the canonical CSS
Color 4 OKLab → linear-sRGB matrices (not an online tool or a guess), with
sanity checks against known reference points (`oklch(1 0 0)` → `#ffffff`,
`oklch(0 0 0)` → `#000000`, `oklch(0.6 0 0)` → `#808080`) passing before
converting the real tokens. The **original `oklch()` string is preserved
alongside the hex value** in each token's `$description`, so nothing is
lost in the conversion — if you need the source-authored value back, it's
right there next to the hex. (Two dark-mode chart colours are outside the
sRGB gamut at full oklch precision and were gamut-clipped; this is flagged
individually in their `$description` rather than silently rounded — see
`06-DESIGN-SYSTEM.md` for detail.)

**Import steps:**

1. Install the **Tokens Studio for Figma** plugin from the Figma Community
   (free).
2. Open it on a Figma file, go to **Settings → Import**, choose "Load from
   file / folder", and select `docs/handoff/figma/tokens.json`.
3. Colours arrive as hex-valued `color` tokens, radii as `dimension`
   tokens, elevations as `shadow` tokens, and font families as `fontFamily`
   tokens.
4. Use the plugin's **Apply** tab to push the token set onto Figma
   styles/variables.

## `design-system-board.html` → html.to.design

A single self-contained HTML page laying out the full design system —
colour swatches, the type scale, radii, elevations, and the component
inventory. Verified: it renders standalone with **zero external requests**
(no CDN scripts, no remote fonts, no remote images — everything is inlined)
— confirmed by scanning the file for any `src=` / `href=` pointing at an
`http(s)://` URL and finding none. That means it works offline and imports
cleanly through a plugin that has to fetch/render the page itself.

**Import steps:**

1. Install the **html.to.design** plugin from the Figma Community.
2. Use its "Import from file" option (not "Import from URL") and select
   `docs/handoff/figma/design-system-board.html`.
3. It arrives as editable Figma layers — real text nodes and shapes for
   every colour group, the template table, the type scale, font cards,
   radii, and elevations.

**If html.to.design is paywalled for you:** its free tier has import
limits that can block a page this size. If you hit that wall, you lose the
one-click "arrives as organized Figma layers" convenience — but nothing is
actually unavailable. Fall back to:

1. The **SVG path** above (`erd.svg`/`user-flows.svg`/`sitemap.svg`) for
   the structural diagrams, which always works regardless of plugin access.
2. **`tokens.json` via Tokens Studio**, which is free and covers every
   colour, radius, elevation, and font-family value the HTML board displays
   — you just have to build the swatch layout by hand from the token
   values instead of getting it pre-arranged.
3. Open `design-system-board.html` directly in any browser to see the
   board visually even without importing it into Figma at all.

## You don't need Figma to read any of this

The Mermaid source for the ERD and user-flow/sitemap diagrams lives
directly inside `04-ERD.md` and `05-USER-FLOWS.md` as fenced ` ```mermaid `
code blocks, and **GitHub renders Mermaid natively** in its file viewer —
no plugin, no export step, no Figma account required. The SVG/JSON/HTML
files in this folder exist specifically for pulling these artifacts into a
live, editable Figma canvas; reading them as documentation does not require
Figma at all.
