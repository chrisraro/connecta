import { expect, test } from "vitest";
import { resolveBuilderEntryRedirect, shouldPrefillCreateForm, newestProfileId } from "./builderEntry";

const profile = (id: string, creationTime: number) => ({ _id: id, _creationTime: creationTime });

test("does nothing when already editing (an id is present)", () => {
    expect(
        resolveBuilderEntryRedirect("existing-id", [profile("a", 1)], 1)
    ).toBeNull();
});

test("does nothing when the user has no profiles yet", () => {
    expect(resolveBuilderEntryRedirect(null, [], 1)).toBeNull();
    expect(resolveBuilderEntryRedirect(null, undefined, 1)).toBeNull();
});

test("does nothing on an unlimited plan (maxProfiles null)", () => {
    expect(
        resolveBuilderEntryRedirect(null, [profile("a", 1)], null)
    ).toBeNull();
});

test("does nothing while still under the plan's profile limit", () => {
    expect(
        resolveBuilderEntryRedirect(null, [profile("a", 1)], 2)
    ).toBeNull();
});

test("redirects to the newest profile once at the plan's limit", () => {
    expect(
        resolveBuilderEntryRedirect(null, [profile("a", 1)], 1)
    ).toBe("a");
});

test("redirects to the newest profile once OVER the plan's limit", () => {
    // Free plan is 1, but a user can end up with more than one (e.g. a
    // downgrade from Pro) — the newest is still the sensible edit target.
    const profiles = [profile("older", 1), profile("newest", 3), profile("middle", 2)];
    expect(resolveBuilderEntryRedirect(null, profiles, 1)).toBe("newest");
});

// --- shouldPrefillCreateForm ---
//
// Regression coverage for the prefill/redirect race fix in
// app/dashboard/builder/page.tsx: the create-mode branch of the builder's
// prefill effect must only run once `entryRedirectId` has settled to `null`
// (the redirect check has positively resolved to "no redirect needed").
// Firing while it's still `undefined` (loading) risks prefilling from a
// stale onboarding snapshot right before a redirect to an existing,
// possibly since-edited profile lands — see the tri-state comment on
// `entryRedirectId` in page.tsx. Firing while it's a string (a redirect id
// — about to navigate away) is pointless and would prefill a form the user
// is about to be routed off of.
//
// This mirrors the exact boolean the effect evaluates
// (`!editingId && entryRedirectId === null && hasOnboardingData`, gated by
// the effect's own `if (hasPrefilled) return;`), extracted verbatim so the
// three-state race can be asserted directly instead of only through a full
// component render.

test("shouldPrefillCreateForm: false once already prefilled, regardless of everything else", () => {
    expect(shouldPrefillCreateForm(null, null, true, true)).toBe(false);
});

test("shouldPrefillCreateForm: false when editing an existing profile (id present)", () => {
    expect(shouldPrefillCreateForm("existing-id", null, false, true)).toBe(false);
});

test("shouldPrefillCreateForm: false while entryRedirectId is still loading (undefined)", () => {
    expect(shouldPrefillCreateForm(null, undefined, false, true)).toBe(false);
});

test("shouldPrefillCreateForm: false while a redirect is pending (entryRedirectId is a profile id)", () => {
    expect(shouldPrefillCreateForm(null, "some-profile-id", false, true)).toBe(false);
});

test("shouldPrefillCreateForm: false once resolved to no-redirect but there is no onboarding data yet", () => {
    expect(shouldPrefillCreateForm(null, null, false, false)).toBe(false);
});

test("shouldPrefillCreateForm: true only once resolved to no-redirect AND onboarding data is present", () => {
    expect(shouldPrefillCreateForm(null, null, false, true)).toBe(true);
});

// --- newestProfileId ---
//
// Task 12 review: app/dashboard/page.tsx's "Edit profile" quick action and
// app/dashboard/profiles/page.tsx's create/edit CTAs picked `profiles[0]`
// as "the" profile to route to, while resolveBuilderEntryRedirect above
// deliberately picks the NEWEST by `_creationTime`. A multi-profile account
// (e.g. downgraded from Pro, still holding several profiles) could get
// routed to a different profile depending on which nav link was clicked.
// Both call sites now reuse this helper instead of `profiles[0]`.

test("newestProfileId: null for an empty list", () => {
    expect(newestProfileId([])).toBeNull();
});

test("newestProfileId: the only profile when there's exactly one", () => {
    expect(newestProfileId([profile("only", 5)])).toBe("only");
});

test("newestProfileId: the newest by _creationTime, regardless of array order", () => {
    const profiles = [profile("older", 1), profile("newest", 3), profile("middle", 2)];
    expect(newestProfileId(profiles)).toBe("newest");
});
