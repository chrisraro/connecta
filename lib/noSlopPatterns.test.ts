import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

/**
 * Guards the "restrained Survey Plan style" cleanup (2026-09-27, owner) from
 * regressing: fails if any .tsx under app/ or components/ reintroduces the
 * "AI slop" decoration the owner called unacceptable — glass/blur, oversized
 * shadows, hover-scale nudges, decorative animate-pulse, gradient blobs, or
 * a couple of literal leftovers (a placeholder name, an off-brand yellow
 * gradient).
 *
 * Excluded, per the cleanup's own scope: components/ui/* (the shared
 * primitives, including skeleton.tsx's legitimate loading animate-pulse),
 * the phone mockup (components/landing/Ios.tsx + landing.module.css), and
 * the surfaces other agents own in parallel (billing, team, the dashboard
 * shell, onboarding, admin).
 */

const ROOTS = ["app", "components"];

const EXCLUDED_DIRS = [
  join("components", "ui"),
  join("app", "dashboard", "billing"),
  join("app", "dashboard", "team"),
  join("app", "dashboard", "onboarding"),
  join("app", "admin"),
  join("components", "billing"),
];

const EXCLUDED_FILES = [
  join("components", "landing", "Ios.tsx"),
  join("components", "landing", "landing.module.css"),
  join("app", "dashboard", "layout.tsx"),
];

const BANNED_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "backdrop-blur", pattern: /backdrop-blur/ },
  { name: "blur-3xl", pattern: /blur-3xl/ },
  { name: "blur-2xl", pattern: /blur-2xl/ },
  { name: "shadow-2xl", pattern: /shadow-2xl/ },
  { name: "shadow-xl", pattern: /shadow-xl/ },
  { name: "hover:scale-", pattern: /hover:scale-/ },
  { name: "group-hover:scale-", pattern: /group-hover:scale-/ },
  { name: "animate-pulse", pattern: /animate-pulse/ },
  { name: "bg-gradient-to-", pattern: /bg-gradient-to-/ },
  { name: "from-yellow-", pattern: /from-yellow-/ },
  { name: "Elevate your", pattern: /Elevate your/ },
  { name: "[Your Name]", pattern: /\[Your Name\]/ },
];

function isExcluded(relPath: string): boolean {
  if (EXCLUDED_FILES.some((f) => relPath === f)) return true;
  return EXCLUDED_DIRS.some((dir) => relPath === dir || relPath.startsWith(dir + sep));
}

function collectTsxFiles(dir: string, cwd: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(cwd, full);
    if (isExcluded(rel)) continue;
    const stats = statSync(full);
    if (stats.isDirectory()) {
      results.push(...collectTsxFiles(full, cwd));
    } else if (entry.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("no-slop guard", () => {
  const cwd = process.cwd();
  const files = ROOTS.flatMap((root) => collectTsxFiles(join(cwd, root), cwd));

  test("scanned at least one file (the scan itself is not silently empty)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files.map((f) => [relative(cwd, f), f] as const))("%s carries no banned pattern", (_rel, file) => {
    const content = readFileSync(file, "utf-8");
    for (const { name, pattern } of BANNED_PATTERNS) {
      // skeleton.tsx is the one component allowed a decorative animate-pulse.
      if (name === "animate-pulse" && file.endsWith(join("components", "ui", "skeleton.tsx"))) continue;
      expect(pattern.test(content), `${relative(cwd, file)} contains banned pattern "${name}"`).toBe(false);
    }
  });
});
