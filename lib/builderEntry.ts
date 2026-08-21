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

    const newest = profiles.reduce((latest, p) =>
        p._creationTime > latest._creationTime ? p : latest
    );
    return newest._id;
}
