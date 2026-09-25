import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A CSS module merges every rule for a class name, so two unrelated
// `.glass` blocks became one: the phone's cover glass (height: 100%, black)
// landed on the Home Screen dock and stretched it down the screen
// (2026-09-25). Each top-level class in this module is declared once.
test("landing.module.css declares each top-level class once", () => {
  const css = readFileSync(join(__dirname, "landing.module.css"), "utf8");
  const seen = new Map<string, number>();
  for (const m of css.matchAll(/^\.([\w-]+)\s*\{/gm)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([name]) => name);
  expect(dupes).toEqual([]);
});
