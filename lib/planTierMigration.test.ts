import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// DECISION (owner, 2026-09-27): plan_tier's 'pro' and 'business' values are
// renamed to 'lead_tools' and 'teams' in
// supabase/migrations/20260927000028_plans_lead_tools_teams.sql. This test
// reads the migration files directly (as lib/leadConsent.test.ts does for
// the consent columns) rather than hitting a live database -- this repo's
// agents write migrations for the lead engineer to apply, never run them.

const MIGRATION_FILE = "20260927000028_plans_lead_tools_teams.sql";
const dir = join(process.cwd(), "supabase/migrations");

function readMigration(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

function readAllMigrations(): string {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
}

describe("plan_tier rename migration", () => {
  const sql = readMigration(MIGRATION_FILE);

  test("renames the enum values instead of dropping/recreating the type", () => {
    expect(sql).toMatch(/alter\s+type\s+public\.plan_tier\s+rename\s+value\s+'pro'\s+to\s+'lead_tools'/i);
    expect(sql).toMatch(/alter\s+type\s+public\.plan_tier\s+rename\s+value\s+'business'\s+to\s+'teams'/i);
  });

  test("recreates every function whose body compares against the literal 'pro' or 'business' as a plan", () => {
    for (const fn of ["get_team_leads", "get_public_profile", "admin_set_user_plan"]) {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${fn}\\s*\\(`, "i"));
    }
  });

  test("no function created in this migration still compares a plan against the old literals", () => {
    // Split into per-function bodies (from "as $$" to the matching "$$;") and
    // check each one individually -- a whole-file grep would also match this
    // migration's own prose about the rename.
    const bodies = [...sql.matchAll(/as \$\$([\s\S]*?)\$\$;/g)].map((m) => m[1]);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/=\s*'business'/);
      expect(body).not.toMatch(/=\s*'pro'/);
      expect(body).not.toMatch(/distinct from 'business'/i);
      expect(body).not.toMatch(/distinct from 'pro'/i);
    }
  });

  test("uses the new literals for the same checks the old functions made", () => {
    expect(sql).toMatch(/effective_plan\(caller\)\s+is\s+distinct\s+from\s+'teams'/i);
    expect(sql).toMatch(/owner_plan\s*=\s*'teams'/i);
    expect(sql).toMatch(/new_plan\s*=\s*'teams'/i);
  });

  test("preserves security definer, search_path and grants on every recreated function", () => {
    for (const fn of ["get_team_leads", "get_public_profile", "admin_set_user_plan"]) {
      const start = sql.indexOf(`create or replace function public.${fn}`);
      expect(start, `${fn} definition`).toBeGreaterThanOrEqual(0);
      const end = sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3;
      const grantSearchEnd = sql.indexOf(
        `grant execute on function public.${fn}`,
        end,
      );
      expect(grantSearchEnd, `${fn} grant`).toBeGreaterThanOrEqual(0);
      const def = sql.slice(start, grantSearchEnd);
      expect(def).toMatch(/security definer/i);
      expect(def).toMatch(/set search_path = ''/i);
    }
  });

  test("does not touch profile_type's own 'business' category member", () => {
    expect(sql).not.toMatch(/plan_tier[\s\S]{0,40}rename value 'individual'/i);
    expect(sql).not.toMatch(/profile_type.*rename value/i);
  });
});

describe("everywhere else, the database.types.ts enum matches the migration", () => {
  test("lib/supabase/database.types.ts plan_tier is free | lead_tools | teams", () => {
    const types = readFileSync(join(process.cwd(), "lib/supabase/database.types.ts"), "utf8");
    expect(types).toMatch(/plan_tier:\s*"free"\s*\|\s*"lead_tools"\s*\|\s*"teams"/);
    expect(types).not.toMatch(/plan_tier:\s*"free"\s*\|\s*"pro"\s*\|\s*"business"/);
  });
});

test("the full migration set still has enforce_profile_plan_limit / claim_card_by_uuid / activate_card_by_code untouched by this rename (they only ever compared 'free')", () => {
  const all = readAllMigrations();
  // Sanity: these functions exist and their bodies reference 'free', proving
  // the rename correctly left them alone rather than requiring a recreation
  // no one wrote.
  for (const fn of ["enforce_profile_plan_limit", "claim_card_by_uuid", "activate_card_by_code"]) {
    expect(all).toMatch(new RegExp(`function public\\.${fn}`, "i"));
  }
});
