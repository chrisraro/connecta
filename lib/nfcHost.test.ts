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

  // The value is concatenated, not resolved: app/admin/factory/page.tsx builds
  // `${nfcHost}/t/${serialNumber}`. A scheme check passes every case below
  // while the resulting tag URL is wrong — and a mis-encoded tag is physical
  // inventory that has to be reissued, not a deploy that can be rolled back.
  describe("requires a bare origin, because the caller concatenates onto it", () => {
    // The exact failure: the serial is swallowed into the fragment, leaving
    // path "/", so every tag written from this host taps through to the
    // homepage rather than a profile.
    test("returns null for a fragment", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app#promo" })).toBeNull();
    });

    test("returns null for a query string", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app?ref=qr" })).toBeNull();
    });

    // Regression guard: `new URL()` reports search/hash as "" for a bare
    // delimiter, so checking the PARSED fields accepts these while the
    // delimiter survives into the returned string — "https://connecta.app?"
    // concatenates to "https://connecta.app?/t/<serial>", turning the serial
    // into a query. The check has to run against the raw value.
    test("returns null for a bare trailing '?' with no query", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app?" })).toBeNull();
    });

    test("returns null for a bare trailing '#' with no fragment", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app#" })).toBeNull();
    });

    // No basePath/assetPrefix in next.config — the app is served at the origin
    // root, so "https://connecta.app/app/t/<serial>" 404s.
    test("returns null for a path", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app/app" })).toBeNull();
    });

    test("returns null for a path that survives trailing-slash stripping", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app/app/" })).toBeNull();
    });

    test("returns null for embedded credentials", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://u:pw@connecta.app" })).toBeNull();
    });

    // Guards the boundary the rule is built on: a root path is what a bare
    // origin parses to, with or without a trailing slash, and must stay
    // accepted — otherwise this fix would reject every correct value too.
    test("still accepts a bare origin, with or without a trailing slash", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app" })).toBe(
        "https://connecta.app",
      );
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://connecta.app/" })).toBe(
        "https://connecta.app",
      );
    });

    // A port is part of the origin, and this is the shape a developer testing
    // Web NFC from a phone against a LAN address actually uses.
    test("still accepts an origin carrying an explicit port", () => {
      expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "http://192.168.1.10:3000" })).toBe(
        "http://192.168.1.10:3000",
      );
    });
  });
});
