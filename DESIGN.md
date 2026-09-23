---
name: Connecta
description: The person as a surveyed, trustworthy lot. Survey Plan, the default public-profile template.
colors:
  whiteprint-ground: "#EEF1F4"
  whiteprint-ink: "#12161F"
  whiteprint-soft: "#4A5468"
  whiteprint-line: "#2B3F8F"
  whiteprint-grid: "rgb(43 63 143 / 0.07)"
  whiteprint-mark: "#D0312D"
  whiteprint-mark-text: "#C42A26"
  whiteprint-action-bg: "#2B3F8F"
  whiteprint-action-ink: "#EEF1F4"
  whiteprint-duotone: "#2B3F8F"
  blueprint-ground: "#2B3F8F"
  blueprint-ink: "#F4F6FA"
  blueprint-soft: "#C9D3F2"
  blueprint-line: "#EEF1F4"
  blueprint-grid: "rgb(238 241 244 / 0.09)"
  blueprint-mark: "#FF5A52"
  blueprint-mark-text: "#FFB3AD"
  blueprint-action-bg: "#EEF1F4"
  blueprint-action-ink: "#1F2F6E"
  blueprint-duotone: "#1A2860"
  graphite-ground: "#12161F"
  graphite-ink: "#EEF1F4"
  graphite-soft: "#A7B0C0"
  graphite-line: "#8FA3E0"
  graphite-grid: "rgb(143 163 224 / 0.08)"
  graphite-mark: "#FF5A52"
  graphite-mark-text: "#FF7A73"
  graphite-action-bg: "#EEF1F4"
  graphite-action-ink: "#12161F"
  graphite-duotone: "#1C2A5E"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(28px, 8.4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1
    fontVariation: "'wdth' 112"
  action:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    fontFeature: "'tnum'"
  data-sm:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "'tnum'"
rounded:
  none: "0px"
spacing:
  grid: "32px"
  gutter: "16px"
  lot-top: "32px"
  lot-bottom: "28px"
  plan-gap: "40px"
  desktop-gutter: "56px"
  desktop-column-gap: "64px"
components:
  button-primary:
    backgroundColor: "{colors.whiteprint-action-bg}"
    textColor: "{colors.whiteprint-action-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    height: "56px"
    width: "100%"
  button-cell:
    backgroundColor: "transparent"
    textColor: "{colors.whiteprint-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    height: "56px"
    width: "100%"
  quick-cell:
    backgroundColor: "transparent"
    textColor: "{colors.whiteprint-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "64px"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.whiteprint-ink}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
    height: "48px"
  status-tag:
    backgroundColor: "transparent"
    textColor: "{colors.whiteprint-mark-text}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  lot-heading:
    backgroundColor: "{colors.whiteprint-ground}"
    textColor: "{colors.whiteprint-ink}"
    typography: "{typography.headline}"
    padding: "0 8px"
---

# Design System: Connecta

## Overview

**Creative North Star: "The Survey Plan"**

A Connecta profile is drawn as a surveyed lot on a drafting sheet: a calm, credible plan that puts the face, the name and the save action first. The sheet is a drafting grid; the person stands inside an eight-corner, 45°-chamfered lot outline; the title block below is square-cornered linework; every section after it is a parcel on one plan, sharing its boundary lines with its neighbours. Content is never boxed into cards. It is bounded by lines, the way a surveyor bounds land.

The world refuses the category default of a round avatar over a stack of pill link buttons on dark glass, and it refuses decorative annotation. Earlier drafts carried bearings, distances, corner numbers, leader lines, a tie line and a point-of-beginning stamp; all of that was retired on 2026-09-24 at the founder's direction. The only survey cue left on a profile is structure: lines, lots, chamfers and the grid. The tap moment is dramatised only on the marketing homepage, never on a profile.

Survey Plan is the **default template**. Its three colourways (whiteprint, blueprint, graphite) are selected by the stored template ids editorial, kinetic and architectural. Industry-specific templates (real estate, MSMEs, professionals, students) will follow and must be variants inside this world, not new worlds. The world lives in `components/survey/` (`sheet.ts` is the colour source of truth, `survey.module.css` the material).

**Legacy shell, pending rebuild.** The warm slate / obsidian tokens in `app/globals.css` (`--connecta-brand`, shadcn `--primary`, `--sidebar-*`, etc.) and the Fraunces / Geist / Newsreader / Space Grotesk / Manrope faces in `lib/fonts.ts` still power the dashboard, admin, shop and landing. They are not this system and must not be extended into new surfaces; they will be replaced as each surface is rebuilt in the Survey Plan world.

**Key Characteristics:**
- Drafting-grid sheet (32px) as the page surface itself, in three colourways.
- One line colour per sheet carries every boundary; weight, not colour, sets hierarchy.
- Portraits print in one ink (screen-blend duotone) inside the chamfered lot outline; listing and product photos stay in true colour.
- Archivo on its width axis: expanded (125) for the name, semi-expanded (112) for lot headings and actions. JetBrains Mono only for real data.
- Square corners everywhere. No pills, no rounded cards, no shadows.
- One authored motion: the lot outline draws closed around the person.

## Colors

Each sheet is a near-monochrome plan: one ground, one ink, one line colour, with red held back for the mark and for state.

### Primary
- **Plan Blue** (`whiteprint-line`, `whiteprint-action-bg`, `blueprint-ground`): the colour of the linework. On whiteprint it draws every boundary, fills the Save contact cell and is the portrait's ink; on blueprint it becomes the ground itself.
- **Lifted Plan Blue** (`graphite-line`): the linework on graphite, lightened so lines hold 7.3:1 on the dark ground.

### Secondary
- **Survey Red** (`*-mark`, `*-mark-text`): the red of the brand mark's point-of-beginning dot. `mark` is the graphic red (dot, tag border, focus ring, field focus, caret); `mark-text` is the text-safe red for status tags, error messages and link hover (5.0:1 whiteprint, 5.6:1 blueprint, 7.1:1 graphite).

### Neutral
- **Whiteprint Paper** (`whiteprint-ground`, `blueprint-line`, `*-action-bg` on dark sheets): the paper of the default sheet; on dark sheets it is the line and the action fill.
- **Drafting Ink** (`whiteprint-ink`, `graphite-ground`): near-black ink on whiteprint; the ground of graphite.
- **Plan Ink Light** (`blueprint-ink`, `graphite-ink`): body text on the dark sheets.
- **Soft Ink** (`*-soft`): secondary text (company, locations, periods, helper lines). Holds at least 6.2:1 on every sheet (6.7 whiteprint, 6.4 blueprint, 8.3 graphite), deliberately above AA so it survives bright outdoor light.
- **Grid** (`*-grid`): the drafting grid, the line colour at 7–9% alpha. Never used for anything but the grid.
- **Duotone Ink** (`*-duotone`): the one ink portraits and gallery images print in.

### Named Rules
**The One Line Rule.** Each sheet has exactly one line colour. Every boundary, rule, outline, icon and square bullet uses it; hierarchy comes from line weight and alpha, never from a second line hue.

**The Red Point Rule.** Red is never a surface or decoration. It marks the brand's point of beginning, status tags on listings, and interaction state (focus ring, active field, caret, errors, link hover). Nothing else is red.

**The Soft Floor Rule.** Soft text never drops below 6.2:1 against its sheet's ground. A new sheet is not valid until ink, soft and mark-text are measured.

## Typography

**Display Font:** Archivo (variable, `wdth` axis), with system-ui fallback, as `--font-survey`
**Body Font:** Archivo, same family at normal width
**Label/Mono Font:** JetBrains Mono, as `--font-survey-mono`, tabular numerals

**Character:** One grotesque carries all lettering and changes width to change voice: stretched wide it reads as the lettering on a title block; at normal width it is quiet body text. The mono is a measuring instrument, not a style.

### Hierarchy
- **Display** (700, clamp(28px, 8.4vw, 40px), 1.04, wdth 125, balanced wrap): the owner's name in the title block. One per page.
- **Headline** (700, 19px, 1, wdth 112): lot headings, sitting on the lot's top boundary.
- **Action** (700, 17px, wdth 112): Save contact, Send my details, the form's submit.
- **Title** (600–700, 17px, 1.375): role line, item titles, experience titles.
- **Body** (400, 17px, 1.65, max 62ch): About text and long descriptions. 15px for secondary descriptions and form labels.
- **Label** (600, 12px): the Call / Email / Website / QR cell captions.
- **Data** (JetBrains Mono 400, 15px prices; 12px dates, periods, testimonial attributions; 11px uppercase status tags).

### Named Rules
**The Width Axis Rule.** Emphasis comes from Archivo's width axis: 125 for the name, 112 for headings and actions. Do not add a second display family.

**The Real Data Rule.** JetBrains Mono is used only for real data: prices, dates and periods, status tags, attributions. Never for decoration, kickers or labels that are not data.

## Layout

Mobile first at 390px. The page is a single column, max 560px, with a 16px gutter. Order: portrait in the lot outline at full content width (max 420px, 5:6 aspect), 20px gap, the title block, social link rows, then the lot plan 40px below.

Each lot pads 16px sides, 32px top (clearing the heading that sits on the line) and 28px bottom. Rows inside a lot are separated by in-section rules with 14px vertical padding.

At 1024px and up the page becomes one plan sheet: max 1180px, 56px inner padding, a double neatline around it, and two columns (440px left, up to 640px right, 64px gap). The left column holds portrait, title block, links and the Contact lot; the right holds the remaining lots in the owner's section order.

The drafting grid is 32px, offset -1px so lines land on the sheet edge, and shows through everywhere including inside the neatline.

Listings, projects and products are a sideways-scrolling strip of plan sheets (80% width, max 340px, 12px gap, scroll-snap), so the next sheet shingles into view.

## Elevation & Depth

Flat. There are no shadows anywhere in the world. Depth is drawn, not lit: line weight carries hierarchy, and lot headings knock out the boundary line behind them with a ground-coloured backing.

### Line-weight hierarchy
- **Neatline** (desktop only): 2px outer border in the line colour plus a 1px inner line at 55% alpha, inset 9px.
- **Lot lines** (1.5px, full line colour): lot boundaries, the portrait outline, title block borders and cell dividers, form fields.
- **In-section rules** (1px, line colour at 38%): between rows inside a lot and between social link rows.
- **Grid** (1px, line colour at 7–9%): the sheet surface.

### Named Rules
**The Drawn Depth Rule.** If something needs to stand apart, give it a heavier line, never a shadow, a tint panel or a blur.

## Shapes

Square corners (0px) on everything interactive or bounding: cells, buttons, fields, tags, the success notice. The only angles are 45° chamfers:

- **Portrait lot**: an eight-corner outline with 45° chamfers (14% of width, 11.7% of height), stroked 1.5px, clipping the photo.
- **Photo frames**: listing and gallery images clip to a shallower eight-corner chamfer (8% / 11%).
- **Plan corner**: each lot plan chamfers exactly one corner, bottom-right, a 24px 45° cut.
- **Brand mark**: the same eight-corner lot with its right side open and a red point-of-beginning dot in the gap (`public/brand/connecta-mark.svg` is the geometry's source of truth). The app icon's rounded tile is the OS icon mask, not a page shape.

Square bullets (8px, line colour) mark service rows.

### Named Rules
**The One Chamfer Rule.** A plan gets one chamfered corner. Chamfering every corner turns a boundary into a badge.

## Components

### Buttons
Full-width, square, filled only once per block.
- **Shape:** square (0px), 56px tall, full width of the title block.
- **Primary (Save contact, form submit):** action-bg fill, action-ink text, Action type, 20px icon. Hover brightens 12% (180ms, expo-out). Disabled drops to 65% opacity.
- **Cell (Send my details):** transparent, separated by a 1.5px top line; hover fills with the line colour at 10%.
- **Quick cells (Call / Email / Website / QR):** an equal-width row of 64px cells, 20px icon over a 12px label, divided by 1.5px lines. Only present actions render.
- **Focus:** 2px outline in the mark red, 3px offset.

### Chips
- **Status tag:** mono 11px uppercase, 1px border in mark red, mark-text colour, square, sitting above the listing photo. The only chip in the world.

### Cards / Containers
There are no cards. Containers are lots:
- **Title block:** a 1.5px square frame holding name, role, company, the quick-cell row, Save contact and Send my details as its last cells.
- **Lot:** a section drawing only its top boundary; the plan draws the outer sides and bottom once, so neighbours share lines. The heading sits on the line as a plan label, backed by the ground colour.
- **Unsurveyed lot:** in owner previews only, an empty section renders with a dashed boundary and a soft helper line. Visitors never see empty sections.

### Inputs / Fields
- **Style:** transparent, 1.5px line-colour border, square, 48px min height, 10px 14px padding, 16px text (prevents mobile zoom), caret in mark red.
- **Focus:** border turns mark red with a 1px mark-red ring.
- **Error:** a mark-text message with an alert icon, `role="alert"`, tied to the submit via `aria-describedby`.

### Navigation
None on a profile. Social links are surveyed rows: icon, platform name, soft host name right-aligned, an up-right arrow, a 1px 38% rule between rows. The Free-plan footer reads "Powered by" with the mark and the expanded wordmark.

### Portrait (signature)
The owner's photo inside the lot outline, printed in one ink: the image is greyscaled and screen-blended over the sheet's duotone colour, so shadows take the ink and highlights stay paper. Without a photo, the lot shows the owner's initials at 72px, expanded, in the line colour. Photos of houses and products are never duotoned.

### Motion
One authored moment: on load the portrait's lot outline draws closed (stroke-dashoffset 1 → 0 over 1100ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 120ms delay). Under `prefers-reduced-motion` everything is drawn and visible from the start. State transitions elsewhere are 180ms on the same curve, colour and brightness only.

## Do's and Don'ts

### Do:
- **Do** set every colour through the sheet's custom properties (`--sv-ground`, `--sv-line`, …) from `sheet.ts`; a new colourway is a new entry there, measured against the Soft Floor Rule.
- **Do** bound content with lines: 1.5px lot lines, 1px rules at 38%, a 2px + 1px neatline on desktop.
- **Do** put lot headings on the boundary line, semi-expanded, backed by the ground.
- **Do** print portraits in one ink and keep listing and product photos in true colour.
- **Do** keep the first viewport to portrait, name, role, company, quick cells and Save contact.
- **Do** keep everything visible under reduced motion.

### Don't:
- **Don't** use rounded corners, pills or rounded cards anywhere on a profile.
- **Don't** use shadows, glass, blur or tinted panels for depth.
- **Don't** use red for fills, headings or decoration; it is for the mark's dot, status tags and interaction state.
- **Don't** use JetBrains Mono for anything but real data.
- **Don't** add survey annotation to profiles: no bearings, coordinates, corner numbers, leader lines, tie lines, point-of-beginning stamps or tap annotations.
- **Don't** put a language toggle on a profile; EN | FIL lives on the marketing site.
- **Don't** show empty sections to visitors; dashed lots are for owner previews only.
- **Don't** extend the legacy shell tokens in `app/globals.css` into new surfaces.
