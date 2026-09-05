import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { acceptInvitesForCurrentUser } from "./teams";

/**
 * Behavior-preservation tests for teams.ts's member-lookup helpers.
 *
 * teams.ts:75,129,274,307 (pre-conversion) each do
 * `ctx.db.query("users").collect()` and filter in JS for
 * `u.teamId === team._id || u._id === team.ownerId`. schema.ts defines
 * `by_teamId` on users specifically for this. These tests seed users on BOTH
 * sides of that filter boundary (in-team, on a different team, on no team,
 * plus the "owner whose teamId isn't set yet" edge case the OR-clause exists
 * for) so a conversion to `.withIndex("by_teamId", ...)` that quietly drops
 * or adds a row fails loudly.
 */

const FUTURE_EXPIRY = Date.now() + 30 * 24 * 60 * 60 * 1000;

async function seedBusinessOwner(
  t: ReturnType<typeof convexTest>,
  clerkId: string,
  email: string,
  seats: number,
) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email,
      clerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "business",
      planExpiresAt: FUTURE_EXPIRY,
    });
    const teamId = await ctx.db.insert("teams", {
      name: "Acme Realty",
      ownerId,
      seats,
      createdAt: Date.now(),
    });
    // Normal case: owner's teamId is set to their own team, same as the real
    // business-upgrade flow (billing.ts:internalActivateInvoice).
    await ctx.db.patch(ownerId, { teamId });
    return { ownerId, teamId };
  });
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  clerkId: string,
  teamId: Id<"teams"> | undefined,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email,
      clerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
      teamId,
    }),
  );
}

test("getMyTeam members include only users whose teamId matches this team, excluding other-team and no-team users", async () => {
  const t = convexTest(schema);
  const { ownerId, teamId } = await seedBusinessOwner(t, "owner_clerk", "owner@test.dev", 5);
  const memberInTeamId = await seedUser(t, "member@test.dev", "member_clerk", teamId);

  const otherTeamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Other Team",
      ownerId: memberInTeamId, // arbitrary distinct owner, not under test
      seats: 5,
      createdAt: Date.now(),
    }),
  );
  // Boundary: on a DIFFERENT team — must be excluded.
  await seedUser(t, "otherteam@test.dev", "otherteam_clerk", otherTeamId);
  // Boundary: on NO team — must be excluded.
  await seedUser(t, "noteam@test.dev", "noteam_clerk", undefined);

  const asOwner = t.withIdentity({ subject: "owner_clerk" });
  const result = await asOwner.query(api.teams.getMyTeam, {});
  if (!result) throw new Error("expected getMyTeam to return a result");

  expect(result.team?._id).toBe(teamId);
  const memberIds = result.members.map((m) => m.userId).sort();
  expect(memberIds).toEqual([ownerId, memberInTeamId].sort());
  expect(result.seatUsage).toEqual({ used: 2, total: 5 });
});

test("getMyTeam still includes the owner when the owner's own teamId isn't set yet (legacy/edge case)", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "owner2@test.dev",
      clerkId: "owner2_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "business",
      planExpiresAt: FUTURE_EXPIRY,
      // teamId intentionally left unset.
    }),
  );
  const teamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Legacy Team",
      ownerId,
      seats: 3,
      createdAt: Date.now(),
    }),
  );
  const memberInTeamId = await seedUser(t, "member2@test.dev", "member2_clerk", teamId);

  const asOwner = t.withIdentity({ subject: "owner2_clerk" });
  const result = await asOwner.query(api.teams.getMyTeam, {});
  if (!result) throw new Error("expected getMyTeam to return a result");

  const memberIds = result.members.map((m) => m.userId).sort();
  expect(memberIds).toEqual([ownerId, memberInTeamId].sort());
  expect(result.seatUsage.used).toBe(2);
});

test("inviteMember counts only this team's own members toward the seat limit", async () => {
  const t = convexTest(schema);
  // seats=2: owner + 1 in-team member already fills every seat.
  const { teamId } = await seedBusinessOwner(t, "owner3_clerk", "owner3@test.dev", 2);
  await seedUser(t, "member3@test.dev", "member3_clerk", teamId);

  // Boundary users that must NOT count against this team's seats.
  const otherTeamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Other",
      ownerId: await ctx.db.insert("users", {
        email: "filler@test.dev",
        clerkId: "filler_clerk",
        role: "agent",
        subscriptionStatus: "active",
        plan: "free",
      }),
      seats: 5,
      createdAt: Date.now(),
    }),
  );
  await seedUser(t, "otherteam3@test.dev", "otherteam3_clerk", otherTeamId);
  await seedUser(t, "noteam3@test.dev", "noteam3_clerk", undefined);

  const asOwner = t.withIdentity({ subject: "owner3_clerk" });
  await expect(
    asOwner.mutation(api.teams.inviteMember, { email: "newperson@test.dev" }),
  ).rejects.toThrow(/no seats available/i);
});

test("inviteMember succeeds when this team (excluding other-team members) has a free seat", async () => {
  const t = convexTest(schema);
  // seats=3: owner + 1 in-team member leaves exactly one free seat.
  const { teamId } = await seedBusinessOwner(t, "owner4_clerk", "owner4@test.dev", 3);
  await seedUser(t, "member4@test.dev", "member4_clerk", teamId);

  // A user on a different team must not consume this team's seat.
  const fillerOwnerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "filler4@test.dev",
      clerkId: "filler4_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );
  const otherTeamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Other4",
      ownerId: fillerOwnerId,
      seats: 5,
      createdAt: Date.now(),
    }),
  );
  await seedUser(t, "otherteam4@test.dev", "otherteam4_clerk", otherTeamId);

  const asOwner = t.withIdentity({ subject: "owner4_clerk" });
  const result = await asOwner.mutation(api.teams.inviteMember, { email: "newperson4@test.dev" });
  expect(result.success).toBe(true);
});

test("acceptInvitesForCurrentUser only counts this team's own members against seats (excludes other-team/no-team users)", async () => {
  const t = convexTest(schema);
  // seats=1, already full with just the owner -> new invite must NOT be linked.
  const { teamId } = await seedBusinessOwner(t, "owner5_clerk", "owner5@test.dev", 1);

  // A user on a different team AND a no-team user must not count toward
  // this team's single seat.
  const fillerOwnerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "filler5@test.dev",
      clerkId: "filler5_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );
  const otherTeamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Other5",
      ownerId: fillerOwnerId,
      seats: 5,
      createdAt: Date.now(),
    }),
  );
  await seedUser(t, "otherteam5@test.dev", "otherteam5_clerk", otherTeamId);
  await seedUser(t, "noteam5@test.dev", "noteam5_clerk", undefined);

  await t.run(async (ctx) => {
    await ctx.db.insert("teamInvites", {
      teamId,
      email: "invitee5@test.dev",
      invitedBy: fillerOwnerId,
      status: "pending",
      createdAt: Date.now(),
    });
  });

  const inviteeId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "invitee5@test.dev",
      clerkId: "invitee5_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );

  await t.run(async (ctx) => {
    const invitee = await ctx.db.get(inviteeId);
    if (invitee) await acceptInvitesForCurrentUser(ctx, invitee);
  });

  const invitee = await t.run(async (ctx) => ctx.db.get(inviteeId));
  // Seat was already full (owner alone == seats: 1), so the invite must NOT
  // have been auto-accepted.
  expect(invitee?.teamId).toBeUndefined();
});

test("acceptInvitesForCurrentUser links the user when this team's own member count leaves a free seat", async () => {
  const t = convexTest(schema);
  const { teamId } = await seedBusinessOwner(t, "owner6_clerk", "owner6@test.dev", 2);

  await t.run(async (ctx) => {
    await ctx.db.insert("teamInvites", {
      teamId,
      email: "invitee6@test.dev",
      invitedBy: (await ctx.db.get(teamId))!.ownerId,
      status: "pending",
      createdAt: Date.now(),
    });
  });

  const inviteeId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "invitee6@test.dev",
      clerkId: "invitee6_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );

  await t.run(async (ctx) => {
    const invitee = await ctx.db.get(inviteeId);
    if (invitee) await acceptInvitesForCurrentUser(ctx, invitee);
  });

  const invitee = await t.run(async (ctx) => ctx.db.get(inviteeId));
  expect(invitee?.teamId).toBe(teamId);
});

test("getTeamLeads aggregates leads only from this team's own members, excluding other-team members' leads", async () => {
  const t = convexTest(schema);
  const { ownerId, teamId } = await seedBusinessOwner(t, "owner7_clerk", "owner7@test.dev", 5);
  const memberInTeamId = await seedUser(t, "member7@test.dev", "member7_clerk", teamId);

  const otherTeamOwnerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "otherowner7@test.dev",
      clerkId: "otherowner7_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );
  // Boundary: this member is on a DIFFERENT team — their leads must be excluded.
  const otherTeamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Other7",
      ownerId: otherTeamOwnerId,
      seats: 5,
      createdAt: Date.now(),
    }),
  );
  const otherTeamMemberId = await seedUser(
    t,
    "otherteam7@test.dev",
    "otherteam7_clerk",
    otherTeamId,
  );

  await t.run(async (ctx) => {
    await ctx.db.insert("leads", {
      ownerId,
      inquirerName: "Owner Lead",
      inquirerContact: "owner-lead@test.dev",
      status: "new",
      createdAt: Date.now(),
    });
    await ctx.db.insert("leads", {
      ownerId: memberInTeamId,
      inquirerName: "Member Lead",
      inquirerContact: "member-lead@test.dev",
      status: "new",
      createdAt: Date.now(),
    });
    await ctx.db.insert("leads", {
      ownerId: otherTeamMemberId,
      inquirerName: "Other Team Lead",
      inquirerContact: "otherteam-lead@test.dev",
      status: "new",
      createdAt: Date.now(),
    });
  });

  const asOwner = t.withIdentity({ subject: "owner7_clerk" });
  const result = await asOwner.query(api.teams.getTeamLeads, {});

  const inquirerNames = result.map((l) => l.inquirerName).sort();
  expect(inquirerNames).toEqual(["Member Lead", "Owner Lead"]);
});
