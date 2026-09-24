import { expect, test, describe } from "vitest";
import { isCardSkinLocked, isPlanLimitError, isTemplateLocked, PLAN_LIMITS } from "./plans";

describe("isPlanLimitError", () => {
  /**
   * The database raises plan rejections with `detail = PLAN_LIMIT` beside the
   * human sentence, so the UI can show its upgrade CTA rather than a dead-end
   * error. Matching on the message text would break the first time somebody
   * rewords it -- a change nobody expects to alter behaviour.
   */
  test("detects the plan-limit code the database raises", () => {
    const err = {
      code: "P0001",
      message: "Upgrade to Pro to create more than one profile.",
      details: "PLAN_LIMIT",
      hint: "",
    };
    expect(isPlanLimitError(err)).toBe(true);
  });

  test("does not fire on a different application code", () => {
    const err = {
      code: "P0001",
      message: "Card is not available for claiming.",
      details: "NOT_AVAILABLE",
      hint: "",
    };
    expect(isPlanLimitError(err)).toBe(false);
  });

  // Guards the exact regression the code channel exists to prevent: the
  // wording is right there in the message, and matching it would pass.
  test("does not match on message text alone", () => {
    const err = {
      code: "P0001",
      message: "Upgrade to Pro to create more than one profile.",
      details: "",
      hint: "",
    };
    expect(isPlanLimitError(err)).toBe(false);
  });

  test.each([[null], [undefined], [new Error("boom")], ["PLAN_LIMIT"], [{}]])(
    "returns false for %p",
    (input) => {
      expect(isPlanLimitError(input)).toBe(false);
    },
  );
});

describe("plan limits", () => {
  test("free is capped at one profile and one active card", () => {
    expect(PLAN_LIMITS.free.maxProfiles).toBe(1);
    expect(PLAN_LIMITS.free.maxActiveCards).toBe(1);
  });

  test("paid tiers are uncapped", () => {
    expect(PLAN_LIMITS.pro.maxProfiles).toBeNull();
    expect(PLAN_LIMITS.business.maxActiveCards).toBeNull();
  });

  test("free plan caps how many leads are VIEWABLE, not how many are captured", () => {
    expect(PLAN_LIMITS.free.leadViewCap).toBe(100);
    expect(PLAN_LIMITS.pro.leadViewCap).toBeNull();
  });
});

describe("isTemplateLocked", () => {
  test("nothing is locked when the plan allows every template", () => {
    expect(isTemplateLocked("editorial", null)).toBe(false);
  });

  test("a template outside the allow-list is locked", () => {
    expect(isTemplateLocked("luxe", ["editorial", "architectural"])).toBe(true);
    expect(isTemplateLocked("editorial", ["editorial", "architectural"])).toBe(false);
  });
});

describe("card skins by plan (confirmed 2026-09-24)", () => {
  test("free keeps exactly the one default skin", () => {
    expect(PLAN_LIMITS.free.allowedCardSkins).toEqual(["charcoal"]);
    expect(isCardSkinLocked("charcoal", PLAN_LIMITS.free.allowedCardSkins)).toBe(false);
    for (const skin of ["scarlet", "crimson", "gradient"] as const) {
      expect(isCardSkinLocked(skin, PLAN_LIMITS.free.allowedCardSkins)).toBe(true);
    }
  });

  test("every subscription unlocks every skin", () => {
    for (const plan of ["pro", "business"] as const) {
      expect(PLAN_LIMITS[plan].allowedCardSkins).toBeNull();
      expect(isCardSkinLocked("scarlet", PLAN_LIMITS[plan].allowedCardSkins)).toBe(false);
    }
  });
});
