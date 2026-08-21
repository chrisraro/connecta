import { describe, expect, test } from "vitest";
import { PAYMENTS_ENABLED, showPaymentReceivedBanner } from "./payments";

describe("PAYMENTS_ENABLED", () => {
  test("is currently false — no gateway has been chosen", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
  });
});

describe("showPaymentReceivedBanner", () => {
  // /dashboard/billing?paid=1 is a real state ONLY when a checkout redirect
  // actually happened, which requires PAYMENTS_ENABLED. With payments off,
  // an old bookmarked/cached link carrying ?paid=1 must not resurrect the
  // "Payment received... confirm with PayRex" banner as a confusing stale
  // state — it must render nothing.
  test("paid=1 and payments enabled shows the banner", () => {
    expect(showPaymentReceivedBanner(true, true)).toBe(true);
  });

  test("paid=1 and payments disabled does NOT show the banner", () => {
    expect(showPaymentReceivedBanner(true, false)).toBe(false);
  });

  test("no paid param never shows the banner, regardless of payments flag", () => {
    expect(showPaymentReceivedBanner(false, true)).toBe(false);
    expect(showPaymentReceivedBanner(false, false)).toBe(false);
  });

  test("defaults to the live PAYMENTS_ENABLED constant when not overridden", () => {
    expect(showPaymentReceivedBanner(true)).toBe(PAYMENTS_ENABLED);
  });
});
