import { describe, expect, test } from "vitest";
import { decideDeletionOutcome, DEGRADED_REDIRECT_DELAY_MS } from "./accountDeletion";

/**
 * decideDeletionOutcome — the pure decision extracted from the Settings
 * page's handleDeleteAccount (Task 4, finding 1). The bug: when
 * identityDeletion.status !== "deleted", the old code only did
 * `console.warn` and then signed the user out and redirected — UX identical
 * to full success, so nobody without devtools open ever learned their Clerk
 * identity is still live and they can sign back in.
 *
 * The settings page itself pulls in @clerk/nextjs, convex/react, and
 * next/navigation hooks that nothing in this codebase's component tests
 * currently mocks (checked: no *.test.tsx anywhere mocks any of the three).
 * Building that harness from scratch is out of scope for this fix, so the
 * outcome DECISION — whether to warn, what to say, how long to hold the
 * screen before redirecting — is extracted here as a pure function and
 * tested directly. The page becomes a thin, mostly-untested wrapper that
 * calls this helper and then toast.warning + a delayed redirect.
 */
describe("decideDeletionOutcome", () => {
  test("status 'deleted' redirects immediately with no warning toast", () => {
    const outcome = decideDeletionOutcome({
      status: "deleted",
      message: "Your account and identity were permanently deleted.",
    });

    expect(outcome).toEqual({
      showWarningToast: false,
      toastMessage: null,
      redirectDelayMs: 0,
    });
  });

  test("status 'pending_configuration' surfaces the server's message as a warning and holds the screen before redirecting", () => {
    const outcome = decideDeletionOutcome({
      status: "pending_configuration",
      message:
        "Your data was deleted. Identity removal is pending configuration — contact support if this persists.",
    });

    expect(outcome.showWarningToast).toBe(true);
    expect(outcome.toastMessage).toBe(
      "Your data was deleted. Identity removal is pending configuration — contact support if this persists."
    );
    // Must be long enough to actually read, not a 1-second flash before
    // signOut() navigates the tab away.
    expect(outcome.redirectDelayMs).toBe(DEGRADED_REDIRECT_DELAY_MS);
    expect(outcome.redirectDelayMs).toBeGreaterThanOrEqual(3000);
  });

  test("status 'failed' also surfaces a warning, not silent success", () => {
    const outcome = decideDeletionOutcome({
      status: "failed",
      message: "Your data was deleted, but identity removal failed. Contact support.",
    });

    expect(outcome.showWarningToast).toBe(true);
    expect(outcome.toastMessage).toBe(
      "Your data was deleted, but identity removal failed. Contact support."
    );
    expect(outcome.redirectDelayMs).toBe(DEGRADED_REDIRECT_DELAY_MS);
  });
});
