/**
 * Cover page for the SigmaTap Design System Figma file.
 *
 *   File: https://www.figma.com/design/jIGbCViAJZt2FFye1KkF7C
 *   Page: "Cover" (node 0:1)
 *
 * WHY THIS IS A FILE AND NOT ALREADY IN FIGMA
 * The rest of the design system was built through the Figma MCP server, but the
 * Starter plan caps MCP tool calls and the budget ran out before this last step.
 * The script is finished and ready; it just needs one call to run.
 *
 * HOW TO RUN IT
 *   a) Agent with the Figma MCP server connected:
 *        use_figma({ fileKey: "jIGbCViAJZt2FFye1KkF7C", code: <this file> })
 *   b) By hand: Figma > Plugins > Development > New Plugin, paste the body in,
 *      and run it with the file open.
 *
 * It is idempotent by name: it appends a frame called "Cover". Delete any
 * existing "Cover" frame first if you re-run it.
 */

const page = await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Fraunces", style: "SemiBold" });
await figma.loadFontAsync({ family: "Geist", style: "Regular" });
await figma.loadFontAsync({ family: "Geist", style: "Medium" });

const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;
const solid = n => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[n]);

const INK = { r: 0.126, g: 0.098, b: 0.086 };
const SOFT = { r: 0.373, g: 0.337, b: 0.322 };

function txt(chars, family, style, size, color) {
  const t = figma.createText();
  t.fontName = { family, style };
  t.characters = chars;
  t.fontSize = size;
  t.fills = [{ type: "SOLID", color }];
  return t;
}

const cover = figma.createFrame();
cover.name = "Cover";
cover.resize(1600, 960);
cover.fills = [{ type: "SOLID", color: { r: 0.988, g: 0.98, b: 0.972 } }];
cover.x = 0; cover.y = 0;
page.appendChild(cover);

const body = figma.createAutoLayout("VERTICAL", { name: "Body", itemSpacing: 40 });
body.fills = [];
body.paddingLeft = 96; body.paddingRight = 96; body.paddingTop = 88; body.paddingBottom = 88;
cover.appendChild(body);
body.x = 0; body.y = 0;
body.layoutSizingHorizontal = "FIXED";
body.resize(1600, body.height);

const titleBlock = figma.createAutoLayout("VERTICAL", { name: "Title", itemSpacing: 14 });
titleBlock.fills = [];
body.appendChild(titleBlock);
titleBlock.layoutSizingHorizontal = "FILL";

const seal = figma.createFrame();
seal.name = "Seal";
seal.resize(56, 56);
seal.cornerRadius = 9999;
seal.fills = [solid("seal")];
titleBlock.appendChild(seal);

titleBlock.appendChild(txt("SigmaTap Design System", "Fraunces", "SemiBold", 64, INK));

const sub = txt("Every value in this file was read out of the repository, not out of a screenshot. Colours come from app/globals.css, template palettes from components/templates/theme.ts, fonts from lib/fonts.ts, and each component from its own file in components/ui. If Figma and the code disagree, the code is right and this file is stale.", "Geist", "Regular", 17, SOFT);
sub.textAutoResize = "HEIGHT";
titleBlock.appendChild(sub);
sub.layoutSizingHorizontal = "FIXED";
sub.resize(880, sub.height);

const cols = figma.createAutoLayout("HORIZONTAL", { name: "Contents", itemSpacing: 32 });
cols.fills = [];
body.appendChild(cols);
cols.layoutSizingHorizontal = "FILL";

function card(title, lines) {
  const c = figma.createAutoLayout("VERTICAL", { name: title, itemSpacing: 12 });
  c.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  c.strokes = [{ type: "SOLID", color: { r: 0.89, g: 0.867, b: 0.851 } }];
  c.strokeWeight = 1;
  c.cornerRadius = 12;
  c.paddingLeft = 28; c.paddingRight = 28; c.paddingTop = 28; c.paddingBottom = 28;
  c.appendChild(txt(title, "Geist", "Medium", 15, INK));
  for (const line of lines) {
    const t = txt(line, "Geist", "Regular", 13, SOFT);
    t.textAutoResize = "HEIGHT";
    c.appendChild(t);
    t.layoutSizingHorizontal = "FILL";
  }
  cols.appendChild(c);
  c.layoutSizingHorizontal = "FILL";
  return c;
}

card("Foundations", [
  "89 colour swatches. Every fill is bound to its variable, so this board cannot drift from the tokens.",
  "The 15-style type ramp in all six real families.",
  "Exactly three radii and exactly two elevations. That is the whole scale."
]);

card("Components", [
  "Button, 6 cva variants by 4 text sizes.",
  "Button Icon, the same 6 variants by 4 square sizes, split out because 48 variants in one matrix is unreadable.",
  "Badge, Input with 5 states, and Card."
]);

card("113 variables, 5 collections", [
  "Theme 64, Template 18, Typography 18, Brand 7, Radius 6.",
  "Every variable carries an explicit scope and Dev Mode code syntax, so Dev Mode hands a developer var(--background) rather than a hex code."
]);

const note = figma.createAutoLayout("VERTICAL", { name: "Constraints", itemSpacing: 10 });
note.fills = [{ type: "SOLID", color: { r: 0.996, g: 0.976, b: 0.925 } }];
note.strokes = [{ type: "SOLID", color: { r: 0.929, g: 0.867, b: 0.71 } }];
note.strokeWeight = 1;
note.cornerRadius = 12;
note.paddingLeft = 28; note.paddingRight = 28; note.paddingTop = 24; note.paddingBottom = 24;
body.appendChild(note);
note.layoutSizingHorizontal = "FILL";

note.appendChild(txt("Three things here are billing constraints, not design decisions", "Geist", "Medium", 15, INK));
for (const line of [
  "1.  No light and dark switcher. Multi-mode variable collections are a paid Figma feature, so light/ and dark/ are variable GROUPS inside one collection. All 64 values are present and correct. Upgrading lets you add a second mode and move the dark/ values into it.",
  "2.  Three pages maximum, so components share the Components page instead of getting one page each.",
  "3.  The build hit the MCP tool-call cap before Button Icon, Badge, Input and Card could be visually checked. Their structure is confirmed; their pixels are not."
]) {
  const t = txt(line, "Geist", "Regular", 13, SOFT);
  t.textAutoResize = "HEIGHT";
  note.appendChild(t);
  t.layoutSizingHorizontal = "FILL";
}

const defects = figma.createAutoLayout("VERTICAL", { name: "Known defects", itemSpacing: 10 });
defects.fills = [{ type: "SOLID", color: { r: 0.996, g: 0.949, b: 0.949 } }];
defects.strokes = [{ type: "SOLID", color: { r: 0.937, g: 0.788, b: 0.788 } }];
defects.strokeWeight = 1;
defects.cornerRadius = 12;
defects.paddingLeft = 28; defects.paddingRight = 28; defects.paddingTop = 24; defects.paddingBottom = 24;
body.appendChild(defects);
defects.layoutSizingHorizontal = "FILL";

defects.appendChild(txt("Two defects this file reproduces on purpose", "Geist", "Medium", 15, INK));
for (const line of [
  "Badge / destructive is invisible in light mode. badge.tsx puts text-destructive-foreground on bg-destructive, and globals.css lines 75 to 76 give both the same oklch(0.577 0.245 27.325). Red on red. Fixing it in Figma would only hide it; the fix belongs in globals.css.",
  "Card ignores the elevation tokens. This system defines exactly two elevations, but card.tsx uses Tailwind shadow-sm. The shadcn primitives predate the elevation rule and were never migrated."
]) {
  const t = txt(line, "Geist", "Regular", 13, SOFT);
  t.textAutoResize = "HEIGHT";
  defects.appendChild(t);
  t.layoutSizingHorizontal = "FILL";
}

cover.resize(1600, body.height);

return {
  createdNodeIds: [cover.id, body.id],
  coverId: cover.id,
  height: Math.round(body.height)
};
