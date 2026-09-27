import { expect, test } from "vitest";
import { MOBILE_NAV } from "./dashboardNav";

// B16 (backlog 2026-09-25): Team was in the desktop sidebar but not on phones.
test("the phone navigation reaches Team", () => {
  expect(MOBILE_NAV.map((i) => i.url)).toContain("/dashboard/team");
});

test("it still reaches the core sections", () => {
  for (const url of ["/dashboard", "/dashboard/profiles", "/dashboard/leads", "/dashboard/cards", "/dashboard/settings"]) {
    expect(MOBILE_NAV.map((i) => i.url)).toContain(url);
  }
});
