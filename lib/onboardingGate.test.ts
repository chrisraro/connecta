import { describe, expect, test } from "vitest";
import { ONBOARDING_PATH, needsOnboardingCheck, onboardingRedirect, onboardedMarker } from "./onboardingGate";

// Owner decision (2026-09-27): onboarding is the first screen for any
// account that hasn't finished it, however they arrive (sign-up, email
// confirmation, Google, password sign-in, an invite link).
describe("needsOnboardingCheck", () => {
  test("applies to the dashboard, except onboarding itself", () => {
    expect(needsOnboardingCheck("/dashboard")).toBe(true);
    expect(needsOnboardingCheck("/dashboard/leads")).toBe(true);
    expect(needsOnboardingCheck("/dashboard/onboarding")).toBe(false);
    expect(needsOnboardingCheck("/dashboard/onboarding/anything")).toBe(false);
  });

  test("never applies outside the dashboard", () => {
    for (const p of ["/", "/auth", "/admin", "/christian-raro", "/api/leads", "/dashboards"]) {
      expect(needsOnboardingCheck(p)).toBe(false);
    }
  });
});

describe("onboardingRedirect", () => {
  test("an account that hasn't finished setup goes to onboarding", () => {
    expect(onboardingRedirect({ onboarded: false, isAdmin: false })).toBe(ONBOARDING_PATH);
  });

  test("finished accounts and admins pass", () => {
    expect(onboardingRedirect({ onboarded: true, isAdmin: false })).toBeNull();
    expect(onboardingRedirect({ onboarded: false, isAdmin: true })).toBeNull();
  });
});

describe("onboardedMarker", () => {
  test("is tied to one account, so switching accounts re-checks", () => {
    expect(onboardedMarker.matches(onboardedMarker.value("user-a"), "user-a")).toBe(true);
    expect(onboardedMarker.matches(onboardedMarker.value("user-a"), "user-b")).toBe(false);
    expect(onboardedMarker.matches(undefined, "user-a")).toBe(false);
  });
});
