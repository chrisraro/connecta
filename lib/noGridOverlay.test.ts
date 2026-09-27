import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// The owner (2026-09-27): the graph-paper grid behind the app read as
// generic AI decoration. It is gone everywhere; this keeps it gone.
const root = process.cwd();

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(name) ? [p] : [];
  });
}

test("no grid-line background anywhere in the app", () => {
  const offenders: string[] = [];
  for (const dir of ["app", "components", "lib"]) {
    for (const file of files(join(root, dir))) {
      if (file.endsWith("noGridOverlay.test.ts")) continue;
      const src = readFileSync(file, "utf8");
      if (/sheet-grid|--sv-grid|sheet\.grid\b|linear-gradient\([^)]*1px, transparent 1px\)/.test(src)) {
        offenders.push(file.slice(root.length + 1));
      }
    }
  }
  expect(offenders).toEqual([]);
});
