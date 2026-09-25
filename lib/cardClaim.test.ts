import { describe, expect, test } from "vitest";
import { shouldAttemptClaim } from "./cardClaim";

// B1 (backlog 2026-09-25): the onboarding claim effect had no guard for a
// failed claim. A failure cleared isClaiming in `finally`, which re-ran the
// effect and retried forever until the claim_card rate limit tripped.
const ready = {
  isAuthLoaded: true,
  cardUuid: "0b8a5c1e-0000-4000-8000-000000000000",
  userId: "user-1",
  cardClaimed: false,
  isClaiming: false,
  claimError: null,
};

describe("shouldAttemptClaim", () => {
  test("claims once everything is ready", () => {
    expect(shouldAttemptClaim(ready)).toBe(true);
  });

  test("never retries on its own after a failed claim", () => {
    expect(shouldAttemptClaim({ ...ready, claimError: "Failed to claim card" })).toBe(false);
  });

  test.each([
    ["auth still loading", { isAuthLoaded: false }],
    ["no card in the link", { cardUuid: null }],
    ["signed out", { userId: undefined }],
    ["already claimed", { cardClaimed: true }],
    ["a claim in flight", { isClaiming: true }],
  ])("waits when %s", (_, patch) => {
    expect(shouldAttemptClaim({ ...ready, ...patch })).toBe(false);
  });
});
