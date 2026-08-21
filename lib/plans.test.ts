import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import { isPlanLimitError, isTemplateLocked } from "./plans";

describe("isTemplateLocked", () => {
  test("returns false when the plan has no template allowlist (pro/business)", () => {
    expect(isTemplateLocked("kinetic", null)).toBe(false);
  });

  test("returns false when the templateId IS in the plan's allowlist", () => {
    expect(isTemplateLocked("editorial", ["editorial", "architectural"])).toBe(false);
  });

  test("returns true when the templateId is NOT in the plan's allowlist", () => {
    expect(isTemplateLocked("kinetic", ["editorial", "architectural"])).toBe(true);
  });

  test("returns true against an empty allowlist", () => {
    expect(isTemplateLocked("editorial", [])).toBe(true);
  });
});

describe("isPlanLimitError", () => {
  // Mirrors lib/nfc.ts#isDuplicateRegistrationError: convex/cards.ts and
  // convex/profiles.ts throw `ConvexError({ code: "PLAN_LIMIT", message })`
  // for every plan-limit rejection (profile count, active-card count,
  // locked template) specifically so the signal survives production's
  // redaction of plain Error messages — detection must key off
  // `.data.code`, never message text, or it silently stops firing in prod.

  test("returns true for a ConvexError with data.code PLAN_LIMIT", () => {
    const err = new ConvexError({
      code: "PLAN_LIMIT",
      message: "Upgrade to Pro for unlimited profiles.",
    });
    expect(isPlanLimitError(err)).toBe(true);
  });

  test("returns false for a plain Error carrying the redacted production message shape", () => {
    const err = new Error("[CONVEX M(profiles:createProfile)] Server Error");
    expect(isPlanLimitError(err)).toBe(false);
  });

  test("returns false for a ConvexError with an unrelated data code", () => {
    const err = new ConvexError({ code: "DUPLICATE_UUID" });
    expect(isPlanLimitError(err)).toBe(false);
  });

  test("returns false for a ConvexError whose data isn't an object with a code", () => {
    const err = new ConvexError("plain string data");
    expect(isPlanLimitError(err)).toBe(false);
  });

  test("returns false for a non-Error thrown value", () => {
    expect(isPlanLimitError("just a string")).toBe(false);
  });
});
