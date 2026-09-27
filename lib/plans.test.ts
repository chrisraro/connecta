import { expect, test, describe } from "vitest";
import {
  isCardSkinLocked,
  isPlanLimitError,
  isTemplateLocked,
  PLAN_LIMITS,
  DEFAULT_PLAN_PRICING,
} from "./plans";
import { PRICING } from "./pricing";

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
      message: "Upgrade to Lead tools to create more than one profile.",
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
      message: "Upgrade to Lead tools to create more than one profile.",
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

// DECISION (owner, 2026-09-27): Pro -> Lead tools, Business -> Teams. Same
// ids' MEANING, new ids and names.
describe("plan ids and names", () => {
  test("the three plans are free, lead_tools and teams", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(["free", "lead_tools", "teams"]);
  });

  test("display names match the homepage", () => {
    expect(PLAN_LIMITS.free.name).toBe("Free");
    expect(PLAN_LIMITS.lead_tools.name).toBe("Lead tools");
    expect(PLAN_LIMITS.teams.name).toBe("Teams");
  });
});

describe("plan limits", () => {
  test("free is capped at one profile and one active card", () => {
    expect(PLAN_LIMITS.free.maxProfiles).toBe(1);
    expect(PLAN_LIMITS.free.maxActiveCards).toBe(1);
  });

  test("paid tiers are uncapped (same limits as the old Pro/Business)", () => {
    expect(PLAN_LIMITS.lead_tools.maxProfiles).toBeNull();
    expect(PLAN_LIMITS.teams.maxActiveCards).toBeNull();
    expect(PLAN_LIMITS.lead_tools.canExportLeads).toBe(true);
    expect(PLAN_LIMITS.teams.canExportLeads).toBe(true);
    expect(PLAN_LIMITS.lead_tools.showBranding).toBe(false);
    expect(PLAN_LIMITS.teams.showBranding).toBe(false);
  });

  test("free plan caps how many leads are VIEWABLE, not how many are captured", () => {
    expect(PLAN_LIMITS.free.leadViewCap).toBe(100);
    expect(PLAN_LIMITS.lead_tools.leadViewCap).toBeNull();
  });

  test("only Teams has a team workspace, with 5 seats", () => {
    expect(PLAN_LIMITS.free.hasTeam).toBe(false);
    expect(PLAN_LIMITS.lead_tools.hasTeam).toBe(false);
    expect(PLAN_LIMITS.teams.hasTeam).toBe(true);
    expect(PLAN_LIMITS.teams.teamSeats).toBe(5);
  });
});

describe("plan feature copy is honest about what is built", () => {
  test("Lead tools does not claim follow-up reminders or analytics", () => {
    const features = PLAN_LIMITS.lead_tools.features.join(" ").toLowerCase();
    expect(features).not.toContain("reminder");
    expect(features).not.toContain("analytics");
  });

  test("Lead tools lists the real, shipped features", () => {
    const features = PLAN_LIMITS.lead_tools.features;
    expect(features).toContain("Unlimited leads");
    expect(features).toContain("Export your leads");
    expect(features).toContain("Unlimited profiles and cards");
  });

  test("Teams says it includes everything in Lead tools", () => {
    expect(PLAN_LIMITS.teams.features[0]).toMatch(/lead tools/i);
  });
});

describe("prices come from the single source of truth (lib/pricing.ts)", () => {
  test("standard monthly prices match PLAN_LIMITS.priceCentavos", () => {
    expect(PLAN_LIMITS.lead_tools.priceCentavos).toBe(PRICING.leadTools.monthly.standard * 100);
    expect(PLAN_LIMITS.teams.priceCentavos).toBe(PRICING.teams.monthly.standard * 100);
  });

  test("match the homepage's confirmed prelaunch and standard prices", () => {
    expect(PRICING.leadTools.monthly).toEqual({ standard: 79, prelaunch: 49 });
    expect(PRICING.leadTools.yearly).toEqual({ standard: 799, prelaunch: 499 });
    expect(PRICING.teams.monthly).toEqual({ standard: 299, prelaunch: 249 });
    expect(PRICING.teams.yearly).toEqual({ standard: 3199, prelaunch: 2699 });
    expect(PRICING.card).toEqual({ standard: 888, prelaunch: 799 });
  });

  test("DEFAULT_PLAN_PRICING is keyed by the new plan ids, in centavos", () => {
    expect(DEFAULT_PLAN_PRICING).toEqual({
      lead_tools: 7900,
      teams: 29900,
    });
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
    for (const plan of ["lead_tools", "teams"] as const) {
      expect(PLAN_LIMITS[plan].allowedCardSkins).toBeNull();
      expect(isCardSkinLocked("scarlet", PLAN_LIMITS[plan].allowedCardSkins)).toBe(false);
    }
  });
});
