import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { PAGE_TITLE, SITE_CONTAINER } from "./siteLayout";

// 2026-10-01 bug: LegalPage (a server component) imported SITE_CONTAINER
// from SiteChrome.tsx, a "use client" module. It received a client
// reference instead of the string, so /privacy and /terms lost their
// container and sat flush left. Client modules export components only.
test("SiteChrome, a client module, exports no plain values", () => {
  const src = readFileSync(join(__dirname, "SiteChrome.tsx"), "utf8");
  expect(src.startsWith('"use client"')).toBe(true);
  expect(src).not.toMatch(/export const /);
});

test("the shared layout classes are plain strings", () => {
  expect(SITE_CONTAINER).toContain("max-w-[1180px]");
  expect(typeof PAGE_TITLE).toBe("string");
});
