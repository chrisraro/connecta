import { expect, test } from "vitest";
import { resolveBuilderEntryRedirect } from "./builderEntry";

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
