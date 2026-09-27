import { describe, expect, test } from "vitest";
import { passwordProblem } from "./authRecovery";
import {
  ONBOARDING_STEP_DEFS,
  SUGGESTED_SERVICES,
  categoryFieldRules,
  isContactStepValid,
  isIdentityStepValid,
  isLastStep,
  isPasswordStepValid,
  isStepValid,
  nextStepIndex,
  previousStepIndex,
  shouldShowPasswordStep,
  stepProgressLabel,
  stepProgressPercent,
  visibleSteps,
  type IdentityFormState,
} from "./onboardingFlow";

const identity = (patch: Partial<IdentityFormState> = {}): IdentityFormState => ({
  category: "individual",
  fullName: "Maria Santos",
  title: "Broker",
  company: "",
  ...patch,
});

describe("categoryFieldRules", () => {
  test("only business requires company", () => {
    expect(categoryFieldRules("individual").companyRequired).toBe(false);
    expect(categoryFieldRules("company").companyRequired).toBe(false);
    expect(categoryFieldRules("business").companyRequired).toBe(true);
  });
});

describe("isIdentityStepValid", () => {
  test("valid once name and title are filled for individual/company", () => {
    expect(isIdentityStepValid(identity())).toBe(true);
    expect(isIdentityStepValid(identity({ category: "company" }))).toBe(true);
  });

  test("blank name blocks it", () => {
    expect(isIdentityStepValid(identity({ fullName: "  " }))).toBe(false);
  });

  test("blank title blocks it", () => {
    expect(isIdentityStepValid(identity({ title: "" }))).toBe(false);
  });

  test("business also requires company/location", () => {
    expect(isIdentityStepValid(identity({ category: "business" }))).toBe(false);
    expect(isIdentityStepValid(identity({ category: "business", company: "Naga City" }))).toBe(true);
  });
});

describe("isContactStepValid", () => {
  test("requires a phone number", () => {
    expect(isContactStepValid({ phone: "" })).toBe(false);
    expect(isContactStepValid({ phone: "   " })).toBe(false);
    expect(isContactStepValid({ phone: "+63 917 000 0000" })).toBe(true);
  });
});

describe("isPasswordStepValid", () => {
  test("blank/blank is valid (skip = don't set one)", () => {
    expect(isPasswordStepValid("", "", passwordProblem)).toBe(true);
  });

  test("uses passwordProblem once something is typed", () => {
    expect(isPasswordStepValid("short", "short", passwordProblem)).toBe(false);
    expect(isPasswordStepValid("longenough1", "mismatch1234", passwordProblem)).toBe(false);
    expect(isPasswordStepValid("longenough1", "longenough1", passwordProblem)).toBe(true);
  });

  test("filling only one field blocks Next", () => {
    expect(isPasswordStepValid("longenough1", "", passwordProblem)).toBe(false);
  });
});

describe("isStepValid dispatch", () => {
  const baseState = {
    identity: identity(),
    contact: { phone: "+63 917 000 0000" },
  };

  test("required steps route to their validators", () => {
    expect(isStepValid("identity", baseState)).toBe(true);
    expect(isStepValid("identity", { ...baseState, identity: identity({ fullName: "" }) })).toBe(false);
    expect(isStepValid("contact", baseState)).toBe(true);
    expect(isStepValid("contact", { ...baseState, contact: { phone: "" } })).toBe(false);
  });

  test("steps with no validator are always valid", () => {
    for (const id of ["welcome", "type", "work", "style", "cardSkin", "photo", "plans"] as const) {
      expect(isStepValid(id, baseState)).toBe(true);
    }
  });

  test("password step defers to isPasswordStepValid when password state is passed", () => {
    expect(
      isStepValid("password", {
        ...baseState,
        password: { password: "short", confirm: "short", passwordProblem },
      }),
    ).toBe(false);
    expect(
      isStepValid("password", {
        ...baseState,
        password: { password: "", confirm: "", passwordProblem },
      }),
    ).toBe(true);
  });

  test("password step is valid when no password state is supplied at all", () => {
    expect(isStepValid("password", baseState)).toBe(true);
  });
});

describe("shouldShowPasswordStep", () => {
  test("only for an invited user, and never in edit mode", () => {
    expect(shouldShowPasswordStep({ invitedAt: "2026-01-01T00:00:00Z", isEditMode: false })).toBe(true);
    expect(shouldShowPasswordStep({ invitedAt: null, isEditMode: false })).toBe(false);
    expect(shouldShowPasswordStep({ invitedAt: undefined, isEditMode: false })).toBe(false);
    expect(shouldShowPasswordStep({ invitedAt: "2026-01-01T00:00:00Z", isEditMode: true })).toBe(false);
  });
});

describe("visibleSteps", () => {
  test("first-run, not invited: everything except password", () => {
    const steps = visibleSteps({ isEditMode: false, showPasswordStep: false });
    expect(steps.map((s) => s.id)).toEqual([
      "welcome",
      "type",
      "identity",
      "contact",
      "work",
      "style",
      "cardSkin",
      "photo",
      "plans",
    ]);
  });

  test("first-run, invited: password included, before plans", () => {
    const steps = visibleSteps({ isEditMode: false, showPasswordStep: true });
    expect(steps.map((s) => s.id)).toEqual([
      "welcome",
      "type",
      "identity",
      "contact",
      "work",
      "style",
      "cardSkin",
      "photo",
      "password",
      "plans",
    ]);
  });

  test("edit mode drops plans AND password even for an invited user", () => {
    const steps = visibleSteps({ isEditMode: true, showPasswordStep: true });
    expect(steps.map((s) => s.id)).toEqual([
      "welcome",
      "type",
      "identity",
      "contact",
      "work",
      "style",
      "cardSkin",
      "photo",
    ]);
  });

  test("required steps can never be filtered out", () => {
    for (const mode of [
      { isEditMode: false, showPasswordStep: false },
      { isEditMode: true, showPasswordStep: true },
    ]) {
      const ids = visibleSteps(mode).map((s) => s.id);
      expect(ids).toContain("type");
      expect(ids).toContain("identity");
      expect(ids).toContain("contact");
    }
  });
});

describe("navigation helpers", () => {
  const steps = visibleSteps({ isEditMode: false, showPasswordStep: false });

  test("stepProgressLabel counts against the visible steps only", () => {
    expect(stepProgressLabel(0, steps)).toBe(`Step 1 of ${steps.length}`);
    expect(stepProgressLabel(steps.length - 1, steps)).toBe(`Step ${steps.length} of ${steps.length}`);
  });

  test("stepProgressPercent runs 0 to 100", () => {
    expect(stepProgressPercent(0, steps)).toBe(0);
    expect(stepProgressPercent(steps.length - 1, steps)).toBe(100);
  });

  test("isLastStep / nextStepIndex / previousStepIndex clamp at the ends", () => {
    expect(isLastStep(0, steps)).toBe(false);
    expect(isLastStep(steps.length - 1, steps)).toBe(true);
    expect(nextStepIndex(steps.length - 1, steps)).toBe(steps.length - 1);
    expect(previousStepIndex(0)).toBe(0);
    expect(nextStepIndex(0, steps)).toBe(1);
    expect(previousStepIndex(2)).toBe(1);
  });
});

describe("ONBOARDING_STEP_DEFS", () => {
  test("only the documented steps are required", () => {
    const required = ONBOARDING_STEP_DEFS.filter((s) => s.required).map((s) => s.id);
    expect(required).toEqual(["welcome", "type", "identity", "contact"]);
  });
});

describe("SUGGESTED_SERVICES", () => {
  test("covers more than just creative-agency work", () => {
    const joined = SUGGESTED_SERVICES.join(" ").toLowerCase();
    expect(joined).toMatch(/real estate/);
    expect(joined).toMatch(/insurance/);
    expect(joined).toMatch(/retail|sari-sari/);
    expect(joined).toMatch(/food|catering/);
    expect(joined).toMatch(/tutoring/);
  });

  test("has no duplicates", () => {
    expect(new Set(SUGGESTED_SERVICES).size).toBe(SUGGESTED_SERVICES.length);
  });
});
