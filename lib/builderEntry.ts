/**
 * Decides whether a "create profile" entry into the builder (no `?id=` in
 * the URL) should instead redirect to editing an existing profile.
 *
 * The free plan's `maxProfiles: 1` means a user who already has a profile
 * can never successfully create a second one through `createProfile` — it
 * throws "Upgrade to Pro for unlimited profiles." (convex/profiles.ts).
 * Landing that user on the builder's blank "Create Profile" form anyway
 * sets up a doomed Save with no warning until they click it (Task 12 —
 * this is exactly how onboarding's own "Go to Profile Builder" hand-off
 * used to fail every single time, before its redirect target was fixed to
 * include `?id=`). Any other nav entry point that still links to the
 * bare `/dashboard/builder` (or a future one) hits the same trap, so this
 * check belongs in the builder itself, not duplicated at every call site.
 *
 * Returns the profile id to redirect to (edit it instead), or null if
 * create-mode should proceed unchanged — already editing, no profiles
 * yet, or still under the plan's limit.
 */
export function resolveBuilderEntryRedirect(
    editingId: string | null,
    profiles: readonly { _id: string; _creationTime: number }[] | undefined,
    maxProfiles: number | null
): string | null {
    if (editingId) return null;
    if (!profiles || profiles.length === 0) return null;
    if (maxProfiles === null) return null;
    if (profiles.length < maxProfiles) return null;

    return newestProfileId(profiles);
}

/**
 * The id of the newest profile in a list (by `_creationTime`), or null for
 * an empty list.
 *
 * Single source of truth for "which profile is THE profile" whenever a nav
 * site has to pick one without the user choosing explicitly. Before this
 * helper existed, `resolveBuilderEntryRedirect` above picked the newest
 * while `app/dashboard/page.tsx`'s "Edit profile" quick action and
 * `app/dashboard/profiles/page.tsx`'s create/edit CTAs independently picked
 * `profiles[0]` (oldest, since `getMyProfiles` returns insertion order) —
 * a multi-profile account (e.g. downgraded from Pro, still holding several
 * profiles) could land on a different profile depending on which link was
 * clicked. All three call sites now go through this one function.
 */
export function newestProfileId(
    profiles: readonly { _id: string; _creationTime: number }[]
): string | null {
    if (profiles.length === 0) return null;
    return profiles.reduce((latest, p) =>
        p._creationTime > latest._creationTime ? p : latest
    )._id;
}

/**
 * Decides whether the builder's create-mode prefill (populating a blank
 * form from the user's onboarding snapshot) should run right now.
 *
 * Extracted from the prefill effect in app/dashboard/builder/page.tsx as a
 * pure decision so the tri-state `entryRedirectId` race — the most fragile
 * part of the Task 12 fix — can be asserted directly instead of only
 * through a full component render:
 *
 * - `entryRedirectId === undefined`: the redirect check (getMyProfiles /
 *   getMyPlan) is still loading — verdict unknown, must NOT prefill yet.
 * - `entryRedirectId === null`: the check has positively resolved to "no
 *   redirect needed" — safe to prefill from onboarding data.
 * - `entryRedirectId` is a string: a redirect to an existing profile is
 *   about to happen — must NOT prefill a form the user is being routed off
 *   of (doing so risks the exact race Task 12 hit live: prefilling from a
 *   stale onboarding snapshot right before the redirect lands on the real,
 *   possibly since-edited profile, then never re-prefilling because
 *   `hasPrefilled` is already true).
 *
 * `hasPrefilled` mirrors the effect's own outer guard (`if (hasPrefilled)
 * return;`) so this function is the complete "should create-mode prefill
 * run" decision, not just the branch condition.
 */
export function shouldPrefillCreateForm(
    editingId: string | null,
    entryRedirectId: string | null | undefined,
    hasPrefilled: boolean,
    hasOnboardingData: boolean
): boolean {
    if (hasPrefilled) return false;
    return !editingId && entryRedirectId === null && hasOnboardingData;
}
