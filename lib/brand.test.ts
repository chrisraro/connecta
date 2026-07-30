import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio, meetsAA, HERALD } from "./brand";

test("contrastRatio computes the WCAG ratio for black on white", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
});

test("contrastRatio is symmetric", () => {
  const a = contrastRatio("#705838", "#fbf9f4");
  const b = contrastRatio("#fbf9f4", "#705838");
  expect(a).toBeCloseTo(b, 5);
});

test("meetsAA rejects a low-contrast muted gray on near-white", () => {
  expect(meetsAA("#a8a29e", "#fbf9f4")).toBe(false);
});

test("meetsAA accepts body-safe ink on near-white", () => {
  expect(meetsAA("#2a2724", "#fbf9f4")).toBe(true);
});

test("meetsAA is more permissive for large text", () => {
  expect(meetsAA("#8a8178", "#fbf9f4", true)).toBe(true);
  expect(meetsAA("#8a8178", "#fbf9f4", false)).toBe(false);
});

test("HERALD brand constant carries the product name", () => {
  expect(HERALD.name).toBe("Herald");
});

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "docs", ".firecrawl", ".superpowers"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Built from fragments so this file does not match its own check.
const STALE_BRAND = new RegExp(["tap", "folio"].join(""), "i");

// Justified exceptions: the old name survives here on purpose because it is
// NOT user-facing brand copy — it is either a real, live infrastructure
// identifier or a client-storage key whose value must stay byte-identical
// across files to keep working. Renaming these would silently break runtime
// behavior rather than just relabel text. Each file carries its own inline
// comment explaining the specific line(s). See docs/superpowers task-4 report
// for the full writeup.
const INFRA_EXCEPTIONS = new Set([
  // Real, live Vercel deployment host used to write physical NFC tags and
  // generate the QR code that ships on real merchandise. The Vercel project
  // itself has not been renamed (out of scope for this task), so changing
  // the string would point every card at a dead URL.
  join("app", "admin", "factory", "page.tsx"),
  // localStorage key for the guest cart id. Read/written identically by
  // CartContext.tsx and mirrored in checkout/page.tsx so a guest's order
  // can find their cart; renaming would orphan any cart created before the
  // rename shipped.
  join("contexts", "CartContext.tsx"),
  join("app", "shop", "checkout", "page.tsx"),
  // localStorage key for an applied discount code, same coupling as above.
  join("app", "shop", "cart", "page.tsx"),
  // localStorage key for leads captured while offline, synced later.
  join("lib", "offline-leads.ts"),
]);

test("no user-facing source file still says the old brand name", () => {
  const selfPath = join("lib", "brand.test.ts");
  const offenders: string[] = [];
  for (const file of walk(process.cwd())) {
    const rel = file.replace(process.cwd(), "").replace(/^[\\/]/, "");
    if (rel === selfPath) continue;
    if (INFRA_EXCEPTIONS.has(rel)) continue;
    if (STALE_BRAND.test(readFileSync(file, "utf8"))) offenders.push(rel);
  }
  expect(offenders, `stale brand in:\n${offenders.join("\n")}`).toEqual([]);
});
