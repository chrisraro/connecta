import { expect, test } from "vitest";
import { isLightOnlyRoute } from "./lightOnlyRoutes";

// The public site is light-only (owner decision 2026-10-01); the app keeps
// the user's theme.
test("the homepage, shop and legal pages are light-only", () => {
  for (const p of ["/", "/shop", "/shop/cart", "/shop/product/nfc-card", "/privacy", "/terms"]) {
    expect(isLightOnlyRoute(p), p).toBe(true);
  }
});

test("the app and public profiles keep the user's theme", () => {
  for (const p of ["/dashboard", "/dashboard/builder", "/admin", "/auth", "/p/abc", "/maria", "/shopping", "/terms-old", null]) {
    expect(isLightOnlyRoute(p), String(p)).toBe(false);
  }
});
