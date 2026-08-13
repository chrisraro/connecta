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

test("resolveTheme keeps inkSoft readable on surface, not just background, when the user picks a dark background on a light template", () => {
  // Editorial is a light template (light background, dark ink, a light
  // `surface` tone). A user swapping in a dark background must not leave
  // `surface` stale — six sections (About, TechStack, Experience,
  // Testimonials, Products, Contact) render text directly on `surface`.
  const resolved = resolveTheme("editorial", {
    backgroundColor: "#0e0e10",
    textColor: "#f2f0ee",
  });
  expect(meetsAA(resolved.colors.inkSoft, resolved.colors.surface)).toBe(true);
  expect(meetsAA(resolved.colors.inkSoft, resolved.colors.background)).toBe(true);
});

test("resolveTheme repairs a deliberately-awful user accent that would fail contrast", () => {
  // #ffe066 (pale yellow) on Editorial's #fbf9f4 (near-white) background is
  // ~1.3:1 — nowhere near AA. accent is rendered as TEXT (job title in
  // HeroSection, numbered section tag in SectionShell), so it must be
  // repaired exactly like ink/inkSoft rather than passed through raw.
  const resolved = resolveTheme("editorial", {
    primaryColor: "#ffe066",
  });
  expect(meetsAA(resolved.colors.accent, resolved.colors.background)).toBe(true);
  expect(meetsAA(resolved.colors.accent, resolved.colors.surface)).toBe(true);
  expect(resolved.colors.accent).toBe(TEMPLATE_THEMES.editorial.colors.accent);
});

test("resolveTheme keeps a user accent that clears AA against both background and surface", () => {
  const resolved = resolveTheme("editorial", {
    primaryColor: "#123456",
  });
  expect(resolved.colors.accent).toBe("#123456");
});

test("resolveTheme still passes the existing default-palette assertions when no palette is given", () => {
  for (const id of TEMPLATE_IDS) {
    const t = TEMPLATE_THEMES[id];
    const resolved = resolveTheme(id, undefined);
    expect(resolved).toEqual(t);
  }
});
