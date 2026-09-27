import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The privacy policy and terms were drafts with bracketed placeholders and a
// "not approved for launch" banner, describing a retired stack. Google's
// OAuth consent screen needs both published (2026-09-27). These guards keep
// them final and true to the product.
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const privacy = read("app/privacy/page.tsx");
const terms = read("app/terms/page.tsx");
const shell = read("components/legal/LegalPage.tsx");

describe("legal pages are final", () => {
  test.each([
    ["privacy", privacy],
    ["terms", terms],
    ["shell", shell],
  ])("%s has no draft banner or placeholder", (_, src) => {
    expect(src).not.toMatch(/DraftNotice|Placeholder|\[[A-Z][A-Z /,&-]{3,}\]/);
    expect(src).not.toMatch(/draft pending legal review|not yet approved for launch/i);
  });

  test.each([
    ["privacy", privacy],
    ["terms", terms],
  ])("%s names the operator and the real contact", (_, src) => {
    expect(src).toContain("CONNECTA.operator.legalName");
    expect(src).toContain("CONNECTA.supportEmail");
  });

  test("neither page describes the retired stack", () => {
    for (const src of [privacy, terms]) expect(src).not.toMatch(/\bClerk\b|\bConvex\b/);
  });
});

describe("privacy policy covers what the product actually does", () => {
  test.each([
    ["Supabase (auth and database)", /Supabase/],
    ["Vercel hosting", /Vercel/],
    ["Resend email", /Resend/],
    ["Google sign-in data", /Google/],
    ["Google API Services User Data Policy", /Google API Services User Data Policy/],
    ["Limited Use", /Limited Use/],
    ["the Data Protection Officer", /Data Protection Officer/],
    ["the National Privacy Commission", /National Privacy Commission/],
    ["account deletion in Settings", /Delete account/],
    ["offline leads kept on the device", /offline/i],
    ["RA 10173", /10173/],
  ])("mentions %s", (_, pattern) => {
    expect(privacy).toMatch(pattern);
  });
});

describe("terms cover refunds and venue", () => {
  test("7-day window for defective or wrong cards, no change-of-mind returns on custom cards", () => {
    expect(terms).toMatch(/7 days/);
    expect(terms).toMatch(/change of mind/i);
  });

  test("disputes go to Naga City courts via the operator constant", () => {
    expect(terms).toContain("CONNECTA.operator.venue");
  });
});

// Fact-check (2026-09-27) found three claims the code didn't back up.
describe("privacy policy states only what the code does", () => {
  test("DiceBear receives the profile name as its seed, so the policy says so", () => {
    expect(privacy).not.toMatch(/only a random seed/);
    expect(privacy).toMatch(/DiceBear[\s\S]{0,200}name shown on that profile/);
  });

  test("the contact form is rate-limited by IP address, not a browser identifier", () => {
    expect(privacy).not.toMatch(/random visitor identifier/);
    expect(privacy).toMatch(/IP address to limit/);
  });

  test("audit log entries are deleted with the account (FK cascade), not kept", () => {
    expect(privacy).not.toMatch(/kept after account deletion/);
    expect(privacy).toMatch(/Audit log entries about your account:<\/strong> deleted with your account/);
  });
});
