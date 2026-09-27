/**
 * The onboarding wizard's step list, gating and navigation — extracted as
 * pure functions (rather than left inline in
 * app/dashboard/onboarding/page.tsx) so the flow's SHAPE is testable without
 * mounting the page's Supabase/Auth/Next hooks, same rationale as
 * lib/cardClaim.ts and lib/onboardingPrefill.ts.
 *
 * Redesign (2026-09-27, owner decisions): there is no "skip for now" that
 * bails out of the whole wizard. A short required core (account type, name,
 * contact) cannot be skipped; everything after it (work, style, card skin,
 * photo, password, plan) is individually skippable — the person can reach a
 * finished profile with defaults for all of it.
 */

export type OnboardingStepId =
  | "welcome"
  | "type"
  | "identity"
  | "contact"
  | "work"
  | "style"
  | "cardSkin"
  | "photo"
  | "password"
  | "plans";

export interface OnboardingStepDef {
  id: OnboardingStepId;
  title: string;
  /** Required steps block "Next" until valid and have no "Skip this step" control. */
  required: boolean;
}

/** The full step list, before edit-mode / invite-only filtering. */
export const ONBOARDING_STEP_DEFS: OnboardingStepDef[] = [
  { id: "welcome", title: "Welcome", required: true },
  { id: "type", title: "Account type", required: true },
  { id: "identity", title: "You", required: true },
  { id: "contact", title: "Contact", required: true },
  { id: "work", title: "Your work", required: false },
  { id: "style", title: "Profile style", required: false },
  { id: "cardSkin", title: "Card skin", required: false },
  { id: "photo", title: "Photo", required: false },
  { id: "password", title: "Password", required: false },
  { id: "plans", title: "Plan", required: false },
];

export type ProfileCategory = "individual" | "company" | "business";

/**
 * Whether the password step should exist for this session at all — only for
 * someone who arrived via a team-invite email (a Supabase Auth user has
 * `invited_at` set once an admin/team-owner invites them) and never in edit
 * mode, where the account already went through first-run setup.
 *
 * There is no reliable client-visible "has no password yet" signal on the
 * Supabase Auth user object, so — per the 2026-09-27 owner decision — every
 * invited user sees this step, worded as an optional add-on ("create a
 * password so you can also sign in with your email") rather than assuming
 * they have none.
 */
export function shouldShowPasswordStep(params: {
  invitedAt: string | null | undefined;
  isEditMode: boolean;
}): boolean {
  return Boolean(params.invitedAt) && !params.isEditMode;
}

/**
 * The steps a given session actually walks through, in order: "plans" and
 * "password" never appear in edit mode (re-running setup on an existing,
 * already-billed profile has nothing to do with either), and "password"
 * additionally requires an invite (see shouldShowPasswordStep).
 */
export function visibleSteps(params: {
  isEditMode: boolean;
  showPasswordStep: boolean;
}): OnboardingStepDef[] {
  return ONBOARDING_STEP_DEFS.filter((step) => {
    if (params.isEditMode && (step.id === "plans" || step.id === "password")) return false;
    if (step.id === "password" && !params.showPasswordStep) return false;
    return true;
  });
}

export interface CategoryFieldRules {
  companyRequired: boolean;
}

const CATEGORY_FIELD_RULES: Record<ProfileCategory, CategoryFieldRules> = {
  individual: { companyRequired: false },
  company: { companyRequired: false },
  business: { companyRequired: true },
};

export function categoryFieldRules(category: ProfileCategory): CategoryFieldRules {
  return CATEGORY_FIELD_RULES[category];
}

export interface IdentityFormState {
  category: ProfileCategory;
  fullName: string;
  title: string;
  company: string;
}

/** "You" step: name and title are always required; company only for a business. */
export function isIdentityStepValid(state: IdentityFormState): boolean {
  const rules = categoryFieldRules(state.category);
  if (state.fullName.trim() === "") return false;
  if (state.title.trim() === "") return false;
  if (rules.companyRequired && state.company.trim() === "") return false;
  return true;
}

export interface ContactFormState {
  phone: string;
}

/** Contact step: phone is required; email is read-only from the account, website is optional. */
export function isContactStepValid(state: ContactFormState): boolean {
  return state.phone.trim() !== "";
}

/**
 * Whether a not-yet-saved password entry blocks "Next" on the (skippable)
 * password step. Leaving both fields blank is always valid — the step is
 * skippable, and blank means "don't set one now". Filling in only one, or
 * two that fail passwordProblem (lib/authRecovery.ts), blocks Next; "Skip
 * this step" is always available regardless.
 */
export function isPasswordStepValid(
  password: string,
  confirm: string,
  passwordProblem: (password: string, confirm: string) => string | null,
): boolean {
  if (password === "" && confirm === "") return true;
  return passwordProblem(password, confirm) === null;
}

/**
 * Whether the given step blocks "Next" right now. Required steps run their
 * validator; skippable steps with no validator (welcome, work, style,
 * cardSkin, photo, plans) are always valid — there is nothing that can be
 * "wrong" about leaving them at their defaults.
 */
export function isStepValid(
  stepId: OnboardingStepId,
  state: {
    identity: IdentityFormState;
    contact: ContactFormState;
    password?: { password: string; confirm: string; passwordProblem: (password: string, confirm: string) => string | null };
  },
): boolean {
  switch (stepId) {
    case "identity":
      return isIdentityStepValid(state.identity);
    case "contact":
      return isContactStepValid(state.contact);
    case "password":
      return state.password
        ? isPasswordStepValid(state.password.password, state.password.confirm, state.password.passwordProblem)
        : true;
    default:
      return true;
  }
}

/** 1-based "Step N of M" label, against the steps actually visible this session. */
export function stepProgressLabel(currentIndex: number, steps: readonly OnboardingStepDef[]): string {
  return `Step ${currentIndex + 1} of ${steps.length}`;
}

/** Progress bar fraction (0–100), 0 on the first step and 100 on the last. */
export function stepProgressPercent(currentIndex: number, steps: readonly OnboardingStepDef[]): number {
  if (steps.length <= 1) return 100;
  return (currentIndex / (steps.length - 1)) * 100;
}

export function isLastStep(currentIndex: number, steps: readonly OnboardingStepDef[]): boolean {
  return currentIndex >= steps.length - 1;
}

export function nextStepIndex(currentIndex: number, steps: readonly OnboardingStepDef[]): number {
  return Math.min(currentIndex + 1, steps.length - 1);
}

export function previousStepIndex(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}

/**
 * Broader, Naga-relevant service suggestions for the (optional) "Your work"
 * step — replacing the old creative-agency-only list (logo design, brand
 * identity, ...) with categories that also fit real estate, insurance,
 * retail, food, professional services and students, per the 2026-09-27 owner
 * decision. Kept here (not inline in the step component) so the "broader,
 * not just creative" requirement is a checkable fact, not a claim.
 */
export const SUGGESTED_SERVICES: string[] = [
  "Real Estate Sales",
  "Property Management",
  "Insurance Services",
  "Retail / Sari-Sari Store",
  "Food & Catering",
  "Photography",
  "Videography",
  "Graphic Design",
  "Web Design",
  "Web Development",
  "Social Media Marketing",
  "Content Writing",
  "Bookkeeping / Accounting",
  "Legal Services",
  "Tutoring",
  "Event Planning",
  "Interior Design",
  "Consulting",
  "Freelance Writing",
  "IT Support",
];
