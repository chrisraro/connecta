import { describe, expect, test } from "vitest";
import { authErrorNotice, googleRedirectTo } from "./oauth";

// Google sign-in (2026-09-27): Supabase's Google provider returns through
// the existing /auth/callback, so admins, tapped cards and new accounts are
// handled the same way as email sign-in.
describe("googleRedirectTo", () => {
  test("returns through the callback, tagged as a Google sign-in", () => {
    expect(googleRedirectTo("https://connectaph.vercel.app", "/auth/callback")).toBe(
      "https://connectaph.vercel.app/auth/callback?provider=google",
    );
  });

  test("keeps a tapped card's id", () => {
    expect(
      googleRedirectTo("https://connectaph.vercel.app", "/auth/callback?card_uuid=43%3A45%3A08%3A03"),
    ).toBe("https://connectaph.vercel.app/auth/callback?card_uuid=43%3A45%3A08%3A03&provider=google");
  });

  test("never leaves the site's own origin", () => {
    expect(googleRedirectTo("https://connectaph.vercel.app", "https://evil.example/x")).toBe(
      "https://connectaph.vercel.app/auth/callback?provider=google",
    );
    expect(googleRedirectTo("https://connectaph.vercel.app", "//evil.example/x")).toBe(
      "https://connectaph.vercel.app/auth/callback?provider=google",
    );
  });
});

describe("authErrorNotice", () => {
  test("a cancelled or failed Google sign-in gets its own notice", () => {
    expect(authErrorNotice(new URLSearchParams("provider=google&error=access_denied"))).toBe(
      "oauth_failed",
    );
  });

  test("an email link error keeps the existing notice", () => {
    expect(authErrorNotice(new URLSearchParams("error=access_denied"))).toBe("link_invalid");
  });
});
