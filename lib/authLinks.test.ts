import { describe, expect, test } from "vitest";
import { authCallbackUrl, authModeUrl, safeReturnPath } from "./authLinks";

// B10 (backlog 2026-09-25): middleware sends signed-out visitors to
// /auth?redirect=<path>, but the auth page dropped it, so everyone landed on
// the dashboard instead of where they were going.
describe("safeReturnPath", () => {
  test.each([
    ["/dashboard/leads", "/dashboard/leads"],
    ["/dashboard/builder?id=abc", "/dashboard/builder?id=abc"],
    ["//evil.example", null],
    ["https://evil.example/x", null],
    ["/\\evil.example", null],
    ["dashboard", null],
    ["/auth", null],
    ["/auth/callback", null],
    [undefined, null],
  ])("%s -> %s", (raw, expected) => {
    expect(safeReturnPath(raw)).toBe(expected);
  });
});

describe("authCallbackUrl", () => {
  test("plain", () => expect(authCallbackUrl({})).toBe("/auth/callback"));
  test("keeps a tapped card", () =>
    expect(authCallbackUrl({ cardUuid: "43:45:08:03" })).toBe("/auth/callback?card_uuid=43%3A45%3A08%3A03"));
  test("carries a safe return path", () =>
    expect(authCallbackUrl({ redirect: "/dashboard/leads" })).toBe("/auth/callback?redirect=%2Fdashboard%2Fleads"));
  test("drops an unsafe one", () => expect(authCallbackUrl({ redirect: "//evil.example" })).toBe("/auth/callback"));
});

describe("authModeUrl", () => {
  test("keeps card and return path when switching tabs", () =>
    expect(authModeUrl("signup", { cardUuid: "c1", redirect: "/dashboard/leads" })).toBe(
      "/auth?mode=signup&card_uuid=c1&redirect=%2Fdashboard%2Fleads",
    ));
});
