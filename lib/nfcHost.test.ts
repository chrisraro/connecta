import { expect, test, describe } from "vitest";
import { resolveNfcHost } from "./nfcHost";

// Task 6b: PRODUCTION_DOMAIN in app/admin/factory/page.tsx used to fall back
// to a retired hardcoded host whenever NEXT_PUBLIC_APP_URL was unset. That
// fallback silently rotted once — the frozen host survived two brand passes on
// the reasoning that the deployment hadn't moved, and by the third rename it was
// 404ing while still being encoded onto physical NFC tags. This function has NO
// fallback: the caller must treat `null` as "writing is unavailable," not fill
// in a guess.
describe("resolveNfcHost", () => {
  test("returns the configured value unchanged", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://example.com" })).toBe(
      "https://example.com",
    );
  });

  test("strips a single trailing slash", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://x.com/" })).toBe("https://x.com");
  });

  test("strips multiple trailing slashes", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://x.com///" })).toBe("https://x.com");
  });

  test("returns null when unset", () => {
    expect(resolveNfcHost({})).toBeNull();
  });

  test("returns null for an empty string", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "" })).toBeNull();
  });

  test("returns null for a whitespace-only value", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "   " })).toBeNull();
  });

  test("trims surrounding whitespace off a real value", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "  https://x.com  " })).toBe("https://x.com");
  });

  // Task: presence isn't usability. `http://localhost:3000` used to pass
  // this function (it's non-empty), which is exactly what .env.example and
  // DEVELOPMENT_SETUP.md tell every developer to set — so a scheme-less or
  // otherwise unparseable value must be rejected the same way an empty one
  // is, forcing the caller to refuse to write instead of encoding garbage.
  test("returns null for a scheme-less host", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "example.com" })).toBeNull();
  });

  test("returns null for a garbage string", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "not a url at all" })).toBeNull();
  });

  test("returns null for a non-http(s) scheme", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "ftp://example.com" })).toBeNull();
  });

  test("returns the value unchanged for a valid https URL", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://example.com" })).toBe(
      "https://example.com",
    );
  });

  // Deliberately NOT blocked — localhost is exactly what local dev sets
  // (see .env.example / DEVELOPMENT_SETUP.md), and Web NFC works on
  // port-forwarded localhost on Chrome for Android. The caller is
  // responsible for surfacing this visibly, not this function for
  // rejecting it.
  test("does not reject a valid http localhost URL", () => {
    expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
  });
});
