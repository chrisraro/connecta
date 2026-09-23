import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SHEETS } from "@/components/survey/sheet";

/*
 * The app's root tokens are the Survey Plan sheets, not a second palette:
 * light mode is the whiteprint sheet, dark mode is the graphite sheet
 * (confirmed 2026-09-24). These guards keep globals.css, the PWA manifest
 * and the retired brand colours from drifting back.
 */

const root = join(__dirname, "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block in globals.css`).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf("\n}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const lower = (s: string | undefined) => (s ?? "").toLowerCase();

test.each([
  [":root", "whiteprint"],
  [".dark", "graphite"],
] as const)("%s tokens come from the %s sheet", (selector, id) => {
  const sheet = SHEETS[id];
  const v = block(selector);
  expect(lower(v["--background"])).toBe(lower(sheet.ground));
  expect(lower(v["--foreground"])).toBe(lower(sheet.ink));
  expect(lower(v["--muted-foreground"])).toBe(lower(sheet.soft));
  expect(lower(v["--primary"])).toBe(lower(sheet.actionBg));
  expect(lower(v["--primary-foreground"])).toBe(lower(sheet.actionInk));
  expect(lower(v["--input"])).toBe(lower(sheet.line));
  expect(lower(v["--ring"])).toBe(lower(sheet.line));
  expect(lower(v["--connecta-brand"])).toBe(lower(sheet.line));
});

test("corners are square: every radius token is 0", () => {
  const v = block(":root");
  for (const name of ["--radius", "--r-sm", "--r-md", "--r-lg"]) {
    expect(v[name], name).toMatch(/^0(px)?$/);
  }
});

test("the PWA manifest wears the whiteprint sheet", () => {
  const manifest = JSON.parse(readFileSync(join(root, "public/manifest.json"), "utf8"));
  expect(lower(manifest.background_color)).toBe(lower(SHEETS.whiteprint.ground));
  expect(lower(manifest.theme_color)).toBe(lower(SHEETS.whiteprint.line));
});

// The retired "struck disc" identity: its brand red, the old manifest colours.
const RETIRED = ["oklch(0.44 0.132 27)", "oklch(0.39 0.138 27)", "#8a2f22", "#030609"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(tsx?|css|json)$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

test("no retired brand colours remain in app, components, lib or public", () => {
  const hits: string[] = [];
  for (const dir of ["app", "components", "lib", "public"]) {
    for (const file of sourceFiles(join(root, dir))) {
      const text = lower(readFileSync(file, "utf8"));
      for (const value of RETIRED) if (text.includes(value)) hits.push(`${file.slice(root.length + 1)}: ${value}`);
    }
  }
  expect(hits).toEqual([]);
});
