import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the admin console's restrained Survey Plan style: no tinted
 * decorative fills, no hover glow/translate/scale, no pulsing panels, no
 * shouty micro-labels, and no Card call sites that override the primitive's
 * own 1.5px square rule with a softer `border border-border`.
 *
 * Walks app/admin/** at test time rather than snapshotting a file list, so a
 * new admin page is covered automatically without editing this test.
 */

const ADMIN_DIR = join(process.cwd(), "app/admin");

const FORBIDDEN_PATTERNS = [
  "hover:shadow",
  "group-hover:translate",
  "animate-pulse",
  "tracking-widest",
  "bg-primary/10",
  "bg-primary/5",
  "rounded-2xl",
  "rounded-3xl",
  "border border-border",
];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const adminFiles = collectFiles(ADMIN_DIR);

test("app/admin has files to check (guards against a bad path silently passing)", () => {
  expect(adminFiles.length).toBeGreaterThan(5);
});

for (const pattern of FORBIDDEN_PATTERNS) {
  test(`no file under app/admin/ contains "${pattern}"`, () => {
    const offenders = adminFiles.filter((file) => readFileSync(file, "utf8").includes(pattern));
    expect(offenders.map((f) => f.replace(process.cwd(), ""))).toEqual([]);
  });
}
