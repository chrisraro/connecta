import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CONNECTA } from "./brand";
import { CONSENT_VERSION, consentProblem, consentVersionFor } from "./leadConsent";
import { PROFILE_COPY } from "@/components/survey/copy";

// L-8 (backlog; wording approved by the DPO 2026-09-27): a visitor's details
// are collected on their consent (RA 10173), so the form asks for it, the
// API refuses a visitor submission without it, and each lead records when
// and to which wording consent was given.
describe("consent wording", () => {
  test("is the approved text, naming the profile owner and the product", () => {
    expect(PROFILE_COPY.consent("Maria Santos")).toBe(
      `I agree to share my name, contact details and message with Maria Santos so they can reply to me. ${CONNECTA.name} stores them for Maria Santos under its Privacy Policy.`,
    );
  });

  test("names the Privacy Policy exactly, so the form can link that phrase", () => {
    // SurveyLeadForm turns this phrase into the /privacy link; if the wording
    // loses it, the link would silently disappear.
    expect(PROFILE_COPY.consent("Maria Santos")).toContain(PROFILE_COPY.privacyPolicy);
  });

  test("the version is a date, so a wording change gets a new one", () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("consentProblem", () => {
  test("a visitor must agree", () => {
    expect(consentProblem({ selfCapture: false, consent: undefined })).toBe("CONSENT_REQUIRED");
    expect(consentProblem({ selfCapture: false, consent: false })).toBe("CONSENT_REQUIRED");
    expect(consentProblem({ selfCapture: false, consent: "true" })).toBe("CONSENT_REQUIRED");
    expect(consentProblem({ selfCapture: false, consent: true })).toBeNull();
  });

  test("an owner's own capture isn't blocked, so leads queued offline before this still sync", () => {
    expect(consentProblem({ selfCapture: true, consent: undefined })).toBeNull();
  });
});

test("consentVersionFor records the wording only when consent was given", () => {
  expect(consentVersionFor(true)).toBe(CONSENT_VERSION);
  expect(consentVersionFor(undefined)).toBeUndefined();
  expect(consentVersionFor("yes")).toBeUndefined();
});

test("a migration adds the consent record to leads and to submit_lead", () => {
  const dir = join(process.cwd(), "supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  expect(sql).toMatch(/add column consent_at\s+timestamptz/);
  expect(sql).toMatch(/add column consent_version\s+text/);
  expect(sql).toMatch(/consent_version\s+text default null/);
});
