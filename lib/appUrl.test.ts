import { describe, expect, test } from "vitest";
import { appOrigin } from "./appUrl";

describe("appOrigin", () => {
  test("keeps a full URL's origin", () => {
    expect(appOrigin("https://connectaph.vercel.app")).toBe("https://connectaph.vercel.app");
    expect(appOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  // Vercel's env UI accepts a bare host; `new URL()` does not, and a bare
  // host in NEXT_PUBLIC_APP_URL failed the production build (2026-09-24).
  test("adds https:// to a bare host", () => {
    expect(appOrigin("connectaph.vercel.app")).toBe("https://connectaph.vercel.app");
  });

  test("trims whitespace, trailing slashes and any path", () => {
    expect(appOrigin("  https://connecta.ph/  ")).toBe("https://connecta.ph");
    expect(appOrigin("connecta.ph/dashboard")).toBe("https://connecta.ph");
  });

  test("returns null for empty or unparseable values", () => {
    expect(appOrigin(undefined)).toBeNull();
    expect(appOrigin("   ")).toBeNull();
    expect(appOrigin("not a url at all")).toBeNull();
    expect(appOrigin("ftp://connecta.ph")).toBeNull();
  });
});
