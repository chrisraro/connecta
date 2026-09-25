import { describe, expect, test } from "vitest";
import {
  RESET_LINK_INVALID,
  UPDATE_PASSWORD_PATH,
  authRouteRedirect,
  completeRecovery,
  recoveryApiBlocked,
  forgotPasswordHref,
  passwordProblem,
  resetRedirectTo,
} from "./authRecovery";

// B5 (backlog 2026-09-25): there was no way to reset a forgotten password.

describe("authRouteRedirect (middleware rules for /auth)", () => {
  const signedIn = { hasUser: true, recovering: false };
  const signedOut = { hasUser: false, recovering: false };
  const recovering = { hasUser: true, recovering: true };

  test("the email-link handlers are always reachable", () => {
    for (const s of [signedIn, signedOut, recovering]) {
      expect(authRouteRedirect("/auth/callback", s)).toBeNull();
      expect(authRouteRedirect("/auth/confirm", s)).toBeNull();
    }
  });

  test("setting a new password needs a verified reset link, not just any session", () => {
    expect(authRouteRedirect(UPDATE_PASSWORD_PATH, recovering)).toBeNull();
    expect(authRouteRedirect(UPDATE_PASSWORD_PATH, signedIn)).toBe(RESET_LINK_INVALID);
    expect(authRouteRedirect(UPDATE_PASSWORD_PATH, signedOut)).toBe(RESET_LINK_INVALID);
  });

  test("a reset session is kept on Choose a new password until it's done", () => {
    expect(authRouteRedirect("/dashboard", recovering)).toBe(UPDATE_PASSWORD_PATH);
    expect(authRouteRedirect("/dashboard/leads", recovering)).toBe(UPDATE_PASSWORD_PATH);
    expect(authRouteRedirect("/admin", recovering)).toBe(UPDATE_PASSWORD_PATH);
    expect(authRouteRedirect("/auth", recovering)).toBe(UPDATE_PASSWORD_PATH);
    // Public pages stay reachable.
    expect(authRouteRedirect("/", recovering)).toBeNull();
    expect(authRouteRedirect("/maria-santos", recovering)).toBeNull();
  });

  test("other /auth sub-paths fold into /auth, and signed-in users skip it", () => {
    expect(authRouteRedirect("/auth/anything", signedOut)).toBe("/auth");
    expect(authRouteRedirect("/auth", signedIn)).toBe("/dashboard");
    expect(authRouteRedirect("/auth", signedOut)).toBeNull();
    expect(authRouteRedirect("/dashboard", signedOut)).toBeNull();
  });
});

describe("recovery links", () => {
  test("the reset email returns through the callback, flagged as recovery", () => {
    expect(resetRedirectTo("https://connectaph.vercel.app")).toBe(
      "https://connectaph.vercel.app/auth/callback?flow=recovery",
    );
  });

  test("a bad link goes back to Forgot password with a notice", () => {
    expect(RESET_LINK_INVALID).toBe("/auth?mode=forgot&notice=reset_link_invalid");
  });
});

describe("passwordProblem", () => {
  test("accepts a matching password of 8 or more characters", () => {
    expect(passwordProblem("correct horse", "correct horse")).toBeNull();
  });

  test("rejects short, mismatched or over-long passwords", () => {
    expect(passwordProblem("short", "short")).toMatch(/8 characters/);
    expect(passwordProblem("long enough", "long enougj")).toMatch(/match/);
    // bcrypt ignores everything past 72 bytes; say so instead of truncating silently.
    const long = "é".repeat(40);
    expect(passwordProblem(long, long)).toMatch(/too long/);
  });
});

/**
 * Code review (2026-09-25): the link handlers' decision itself is tested here,
 * so dropping a check in /auth/confirm or /auth/callback can't ship silently.
 */
describe("completeRecovery (shared by /auth/confirm and /auth/callback)", () => {
  const sign = async (id: string) => `pass-for-${id}`;

  test("a verified link opens Set a new password with a pass for that account", async () => {
    expect(await completeRecovery(async () => "user-a", sign)).toEqual({
      location: UPDATE_PASSWORD_PATH,
      pass: "pass-for-user-a",
    });
  });

  test("a link that fails, throws or names no user asks for a new one, with no pass", async () => {
    const invalid = { location: RESET_LINK_INVALID, pass: null };
    expect(await completeRecovery(async () => null, sign)).toEqual(invalid);
    expect(
      await completeRecovery(async () => {
        throw new Error("otp_expired");
      }, sign),
    ).toEqual(invalid);
  });

  test("with no signing secret the reset fails closed", async () => {
    expect(await completeRecovery(async () => "user-a", async () => null)).toEqual({
      location: RESET_LINK_INVALID,
      pass: null,
    });
  });
});

describe("forgotPasswordHref", () => {
  test("keeps the tapped card across the detour", () => {
    expect(forgotPasswordHref()).toBe("/auth?mode=forgot");
    expect(forgotPasswordHref("43:45:08:03")).toBe("/auth?mode=forgot&card_uuid=43%3A45%3A08%3A03");
  });
});

/** Security re-review (2026-09-25): containment covered pages but not the API. */
describe("recoveryApiBlocked", () => {
  test("a reset session can only reach the endpoint that saves the password", () => {
    expect(recoveryApiBlocked("/api/auth/update-password", true)).toBe(false);
    expect(recoveryApiBlocked("/api/account/delete", true)).toBe(true);
    expect(recoveryApiBlocked("/api/leads", true)).toBe(true);
  });

  test("public endpoints and ordinary sessions are unaffected", () => {
    expect(recoveryApiBlocked("/api/health", true)).toBe(false);
    expect(recoveryApiBlocked("/api/webhooks/x", true)).toBe(false);
    expect(recoveryApiBlocked("/api/account/delete", false)).toBe(false);
    expect(recoveryApiBlocked("/dashboard", true)).toBe(false);
  });
});
