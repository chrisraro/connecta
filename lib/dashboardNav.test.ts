import { expect, test } from "vitest";
import { DASHBOARD_SECTIONS, MOBILE_NAV, dashboardSectionTitle } from "./dashboardNav";

// B16 (backlog 2026-09-25): Team was in the desktop sidebar but not on phones.
test("the phone navigation reaches Team", () => {
  expect(MOBILE_NAV.map((i) => i.url)).toContain("/dashboard/team");
});

test("it still reaches the core sections", () => {
  for (const url of ["/dashboard", "/dashboard/profiles", "/dashboard/leads", "/dashboard/cards", "/dashboard/settings"]) {
    expect(MOBILE_NAV.map((i) => i.url)).toContain(url);
  }
});

// Design consistency (2026-10-01): one name per section. The sidebar, the
// phone top bar and the page title all read DASHBOARD_SECTIONS; the bottom
// bar uses each section's short label.
test("every section has one name, used by the top bar", () => {
  expect(DASHBOARD_SECTIONS.map((s) => s.title)).toEqual([
    "Overview", "Profiles", "Leads", "NFC cards", "Team", "Billing", "Settings",
  ]);
  expect(dashboardSectionTitle("/dashboard")).toBe("Overview");
  expect(dashboardSectionTitle("/dashboard/leads")).toBe("Leads");
  expect(dashboardSectionTitle("/dashboard/cards")).toBe("NFC cards");
  expect(dashboardSectionTitle("/dashboard/billing")).toBe("Billing");
  expect(dashboardSectionTitle("/dashboard/builder")).toBe("Profile builder");
  expect(dashboardSectionTitle("/dashboard/onboarding")).toBe("Profile setup");
  expect(dashboardSectionTitle("/elsewhere")).toBeNull();
});

test("the bottom bar's labels are the sections' short labels", () => {
  for (const item of MOBILE_NAV) {
    const section = DASHBOARD_SECTIONS.find((s) => s.url === item.url);
    expect(section, item.url).toBeDefined();
    expect(item.title).toBe(section!.short);
  }
});
