import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// DECISION (owner, 2026-09-27): team invites become consent, not silent
// membership -- supabase/migrations/20260927000029_team_invites_consent.sql.
// Read directly, as lib/leadConsent.test.ts and lib/planTierMigration.test.ts
// do -- this repo's agents write migrations for the lead engineer to apply,
// never run them against a live database.

const MIGRATION_FILE = "20260927000029_team_invites_consent.sql";
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

function functionBody(sql: string, name: string, fromCreateOrReplace = false): string {
  const marker = fromCreateOrReplace
    ? `create or replace function public.${name}`
    : `create function public.${name}`;
  const start = sql.indexOf(marker);
  expect(start, `${name} definition (${marker})`).toBeGreaterThanOrEqual(0);
  const bodyStart = sql.indexOf("as $$", start);
  const bodyEnd = sql.indexOf("$$;", bodyStart);
  return sql.slice(bodyStart, bodyEnd + 3);
}

describe("team invite consent migration", () => {
  const sql = readMigration(MIGRATION_FILE);

  test("adds 'declined' to invite_status", () => {
    expect(sql).toMatch(/alter\s+type\s+public\.invite_status\s+add\s+value\s+'declined'/i);
  });

  test("team_invite_member no longer updates users.team_id", () => {
    const body = functionBody(sql, "team_invite_member");
    expect(body).not.toMatch(/update\s+public\.users\s+set\s+team_id/i);
    // It still inserts the pending row and returns the {inviteId, hasAccount}
    // shape the server route depends on to decide whether to send the
    // Supabase invite email.
    expect(body).toMatch(/insert into public\.team_invites[\s\S]*'pending'/i);
    expect(body).toMatch(/jsonb_build_object\('inviteId',\s*new_id,\s*'hasAccount',\s*existing\.id is not null\)/i);
  });

  test("team_invite_member keeps the seat, self-invite, duplicate and other-team checks", () => {
    const body = functionBody(sql, "team_invite_member");
    expect(body).toMatch(/NO_SEATS/);
    expect(body).toMatch(/SELF_INVITE/);
    expect(body).toMatch(/ALREADY_MEMBER/);
    expect(body).toMatch(/DUPLICATE_INVITE/);
    expect(body).toMatch(/OTHER_TEAM/);
  });

  test("team_invite_member notifies an existing account's user row, not a brand-new email", () => {
    const body = functionBody(sql, "team_invite_member");
    expect(body).toMatch(/if existing\.id is not null then/i);
    expect(body).toMatch(/insert into public\.notifications/i);
  });

  test("team_decline_invite exists, is invitee-only (matched by their own row's email), and sets 'declined'", () => {
    const body = functionBody(sql, "team_decline_invite");
    expect(body).toMatch(/select email into caller_email from public\.users where id = caller/i);
    expect(body).toMatch(/lower\(inv\.email\) is distinct from lower\(coalesce\(caller_email, ''\)\)/i);
    expect(body).toMatch(/set status = 'declined'/i);
  });

  test("get_my_invites matches the caller's own row's email and only returns pending invites", () => {
    const body = functionBody(sql, "get_my_invites");
    expect(body).toMatch(/select email into caller_email from public\.users where id = caller/i);
    expect(body).toMatch(/i\.status = 'pending'/i);
    expect(body).toMatch(/'teamName'/);
    expect(body).toMatch(/'ownerName'/);
    expect(body).toMatch(/'invitedAt'/);
  });

  test("get_my_team only returns pendingInvites to the team owner", () => {
    const body = functionBody(sql, "get_my_team", true);
    expect(body).toMatch(/if owner then/i);
    expect(body).toMatch(/invites := '\[\]'::jsonb/);
  });

  test("effective_plan grants a member the owner's Teams plan without calling itself on the owner", () => {
    const body = functionBody(sql, "effective_plan", true);
    expect(body).toMatch(/u\.team_id is not null/);
    expect(body).toMatch(/u\.id <> t\.owner_id/);
    // Must not recurse by calling effective_plan on the owner's id.
    expect(body).not.toMatch(/effective_plan\(\s*t\.owner_id\s*\)/i);
    expect(body).not.toMatch(/effective_plan\(\s*o\.id\s*\)/i);
    // The owner's plan is computed inline from the owner's own columns.
    expect(body).toMatch(/o\.plan = 'free'/);
    expect(body).toMatch(/o\.plan_expires_at/);
    expect(body).toMatch(/then 'teams'::public\.plan_tier/);
  });

  test("every recreated/created SECURITY DEFINER function keeps set search_path = ''", () => {
    for (const fn of [
      "team_invite_member",
      "team_decline_invite",
      "get_my_invites",
      "get_my_team",
      "effective_plan",
    ]) {
      const start = sql.indexOf(`function public.${fn}`);
      expect(start, fn).toBeGreaterThanOrEqual(0);
      const bodyStart = sql.indexOf("as $$", start);
      const def = sql.slice(start, bodyStart);
      expect(def, fn).toMatch(/security definer/i);
      expect(def, fn).toMatch(/set search_path = ''/i);
    }
  });

  test("grants authenticated-only execute on every new/replaced function, none to anon", () => {
    for (const grantLine of [
      "grant execute on function public.team_invite_member(text) to authenticated;",
      "grant execute on function public.team_decline_invite(uuid) to authenticated;",
      "grant execute on function public.get_my_invites() to authenticated;",
    ]) {
      expect(sql).toContain(grantLine);
    }
    expect(sql).toMatch(/revoke all on function public\.team_invite_member\(text\) from public, anon;/);
    expect(sql).toMatch(/revoke all on function public\.team_decline_invite\(uuid\) from public, anon;/);
    expect(sql).toMatch(/revoke all on function public\.get_my_invites\(\) from public, anon;/);
  });

  test("keeps team_accept_invite untouched -- this migration only adds/replaces the functions it names", () => {
    expect(sql).not.toMatch(/function public\.team_accept_invite/);
  });
});

test("team_accept_invite still exists somewhere in the full migration set and matches by verified email", () => {
  const all = readAllMigrations();
  expect(all).toMatch(/function public\.team_accept_invite/);
  expect(all).toMatch(/lower\(inv\.email\) is distinct from lower\(coalesce\(caller_email, ''\)\)/);
});

describe("database.types.ts matches the migration", () => {
  test("invite_status includes 'declined'", () => {
    const types = readFileSync(join(process.cwd(), "lib/supabase/database.types.ts"), "utf8");
    expect(types).toMatch(/invite_status:\s*"pending"\s*\|\s*"accepted"\s*\|\s*"revoked"\s*\|\s*"declined"/);
  });

  test("team_invite_member returns Json, and team_decline_invite / get_my_invites are declared", () => {
    const types = readFileSync(join(process.cwd(), "lib/supabase/database.types.ts"), "utf8");
    expect(types).toMatch(/team_invite_member:\s*\{\s*Args:\s*\{\s*invite_email:\s*string\s*\};\s*Returns:\s*Json\s*\};/);
    expect(types).toMatch(/team_decline_invite:\s*\{\s*Args:\s*\{\s*invite_id:\s*string\s*\};\s*Returns:\s*undefined\s*\};/);
    expect(types).toMatch(/get_my_invites:\s*\{\s*Args:\s*never;\s*Returns:\s*Json\s*\};/);
  });
});
