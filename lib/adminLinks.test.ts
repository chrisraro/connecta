import { expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// B7 (backlog 2026-09-25): the admin dashboard linked to /admin/analytics,
// which has no page. Every /admin link in the console must reach a route.
const root = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

function routeExists(href: string): boolean {
  const segments = href.split(/[?#]/)[0].split("/").filter(Boolean);
  const dir = join(root, "app", ...segments);
  return ["page.tsx", "page.ts"].some((f) => existsSync(join(dir, f)));
}

test("every /admin link in the console resolves to a page", () => {
  const broken: string[] = [];
  for (const file of files(join(root, "app/admin"))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/["'`](\/admin(?:\/[\w-]+)*)["'`]/g)) {
      if (!routeExists(m[1])) broken.push(`${file.slice(root.length + 1)}: ${m[1]}`);
    }
  }
  expect(broken).toEqual([]);
});
