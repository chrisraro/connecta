import { expect, test } from "vitest";
import { siteVerification } from "./siteVerification";

// Google's OAuth branding check needs the homepage verified in Search Console
// (2026-09-27). A *.vercel.app host can't take DNS records, so the HTML tag
// method is used: the token comes from GOOGLE_SITE_VERIFICATION.
test("renders Google's verification token when set", () => {
  expect(siteVerification("  abc123-TOKEN  ")).toEqual({ google: "abc123-TOKEN" });
});

test("accepts the whole meta tag pasted by mistake", () => {
  expect(
    siteVerification('<meta name="google-site-verification" content="abc123-TOKEN" />'),
  ).toEqual({ google: "abc123-TOKEN" });
});

test("adds nothing when unset or blank", () => {
  expect(siteVerification(undefined)).toBeUndefined();
  expect(siteVerification("   ")).toBeUndefined();
});
