import { describe, expect, test } from "vitest";
import {
  autoLinkTarget,
  claimNotice,
  claimedCardsHref,
  shouldAttemptClaim,
  shouldAutoLinkReturningClaim,
} from "./cardClaim";

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

// B2 / B3 (backlog 2026-09-25): a card claimed by someone who already has a
// profile was never linked to it. Decision: auto-link to the newest profile;
// the owner can change it on the Cards page.
describe("autoLinkTarget", () => {
  test("picks the only profile", () => {
    expect(autoLinkTarget([{ id: "p1", created_at: "2026-09-01T00:00:00Z" }])).toBe("p1");
  });

  test("picks the newest of several", () => {
    expect(
      autoLinkTarget([
        { id: "old", created_at: "2026-01-01T00:00:00Z" },
        { id: "new", created_at: "2026-09-01T00:00:00Z" },
      ]),
    ).toBe("new");
  });

  test("is null with no profiles or while they load", () => {
    expect(autoLinkTarget([])).toBeNull();
    expect(autoLinkTarget(undefined)).toBeNull();
  });
});

describe("shouldAutoLinkReturningClaim", () => {
  const ready = {
    claimedCardId: "card-1",
    onboardingCompleted: true,
    isEditMode: false,
    profilesLoaded: true,
    linkState: "idle" as const,
  };

  test("links a card claimed by someone who already finished setup", () => {
    expect(shouldAutoLinkReturningClaim(ready)).toBe(true);
  });

  test.each([
    ["no card claimed", { claimedCardId: null }],
    ["first-run setup (Finish links it)", { onboardingCompleted: false }],
    ["edit mode (Finish links it)", { isEditMode: true }],
    ["profiles still loading", { profilesLoaded: false }],
    ["already linking", { linkState: "linking" as const }],
    ["already linked", { linkState: "linked" as const }],
    ["a link that failed", { linkState: "failed" as const }],
  ])("waits or stops when %s", (_, patch) => {
    expect(shouldAutoLinkReturningClaim({ ...ready, ...patch })).toBe(false);
  });
});

describe("claim notice on the Cards page", () => {
  test("the tap page's redirect says whether the card was linked", () => {
    expect(claimedCardsHref(true)).toBe("/dashboard/cards?claimed=linked");
    expect(claimedCardsHref(false)).toBe("/dashboard/cards?claimed=unlinked");
  });

  test("the Cards page reads it back, ignoring anything else", () => {
    expect(claimNotice("linked")).toBe("linked");
    expect(claimNotice("unlinked")).toBe("unlinked");
    expect(claimNotice("1")).toBeNull();
    expect(claimNotice(null)).toBeNull();
  });
});
