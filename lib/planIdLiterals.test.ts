import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PLAN_LIMITS, type PlanId } from "./plans";

/**
 * DECISION (owner, 2026-09-27): "pro" and "business" stopped being plan ids;
 * they are "lead_tools" and "teams" now (see PLAN_LIMITS / PlanId here, and
 * supabase/migrations/20260927000028_plans_lead_tools_teams.sql for the
 * database side of the rename).
 *
 * This guards the migration from drifting back: any TS/TSX source under app,
 * components, lib or hooks that still writes "pro" or "business" as a PLAN
 * value is a bug (the identifier no longer exists in PlanId, or the compared
 * value no longer exists in the plan_tier enum).
 *
 * The tricky part is that "pro" and "business" are also used for OTHER
 * things in this codebase that must be left alone:
 *   - profile_type / ProfileCategory is "individual" | "company" | "business"
 *     (a business card CATEGORY, unrelated to billing)
 *   - components/landing/IndustryDemo.tsx's Industry is
 *     "realtor" | "shop" | "pro" | "student" ("pro" = professional)
 *
 * Neither of those ever appears next to the word "plan" or alongside "free"
 * (plan ids always include "free"; the categories above never do), so that
 * is the signal used to tell a stale PLAN literal from an unrelated one.
 */

const root = join(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "hooks"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...sourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

// A quoted "pro" or "business" (either quote style), case-insensitive so a
// capitalised "Pro"/"Business" plan-name string also counts.
const STALE_LITERAL = /["'](pro|business)["']/i;
// PLAN_LIMITS.pro / PLAN_LIMITS["business"] / PLAN_LIMITS['pro'] etc.
const PLAN_LIMITS_ACCESS = /PLAN_LIMITS\s*(?:\.\s*(pro|business)\b|\[\s*["'](pro|business)["']\s*\])/i;
// Something that reads like a plan comparison/assignment: plan === "pro",
// .plan !== "business", plan: "pro", newPlan = "business", etc.
const PLAN_COMPARISON = /\bplan\w*\s*(===|!==|==|!=|[:=])\s*["'](pro|business)["']/i;

function isFlagged(line: string): { flagged: boolean; reason?: string } {
  if (PLAN_LIMITS_ACCESS.test(line)) return { flagged: true, reason: "PLAN_LIMITS.pro/business access" };
  if (PLAN_COMPARISON.test(line)) return { flagged: true, reason: "plan compared/assigned to pro/business" };

  if (STALE_LITERAL.test(line)) {
    const lower = line.toLowerCase();
    // A PlanId union always lists "free" alongside the paid tiers; the
    // unrelated profile-category and industry unions never do.
    if (lower.includes("free")) return { flagged: true, reason: 'union literal listed with "free"' };
    // Any other mention of the word "plan" beside the literal is worth
    // flagging too (e.g. a stray plan-pricing key, a plan grant label).
    if (/\bplans?\b/.test(lower)) return { flagged: true, reason: 'the word "plan" appears on the same line' };
  }

  return { flagged: false };
}

test("PlanId is exactly free | lead_tools | teams", () => {
  const ids: PlanId[] = ["free", "lead_tools", "teams"];
  expect(Object.keys(PLAN_LIMITS).sort()).toEqual([...ids].sort());
});

test("no app/components/lib/hooks source still uses \"pro\"/\"business\" as a plan value", () => {
  const hits: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of sourceFiles(join(root, dir))) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      // This file itself necessarily talks ABOUT the old literals in prose.
      if (file === __filename) continue;

      const text = readFileSync(file, "utf8");
      text.split(/\r?\n/).forEach((line, i) => {
        const { flagged, reason } = isFlagged(line);
        if (flagged) {
          hits.push(`${relative(root, file)}:${i + 1} (${reason}): ${line.trim()}`);
        }
      });
    }
  }
  expect(hits).toEqual([]);
});
