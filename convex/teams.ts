import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./authz";
import { effectivePlan } from "./billing";

/**
 * Teams (B2B workspace, Phase 4).
 *
 * Team features require the OWNER to be on an effective "business" plan. All
 * mutations enforce this server-side; UI gating is cosmetic. Invites by email
 * auto-link an existing user; otherwise they stay pending until that email
 * signs in (acceptInvitesForCurrentUser, hooked into users.syncUser).
 */

function isBusiness(user: Doc<"users">): boolean {
  return effectivePlan(user) === "business";
}

// Load the owner's team, asserting the caller owns it and is on business plan.
async function requireOwnedTeam(
  ctx: MutationCtx,
  user: Doc<"users">
): Promise<Doc<"teams">> {
  if (!isBusiness(user)) {
    throw new Error("Team features require the Business plan");
  }
  const team = await ctx.db
    .query("teams")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .first();
  if (!team) throw new Error("No team workspace found");
  return team;
}

export const getMyTeam = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const plan = effectivePlan(user);

    // The team the user belongs to (owner's team or one they were invited to).
    let team: Doc<"teams"> | null = null;
    if (user.teamId) {
      team = await ctx.db.get(user.teamId);
    }
    if (!team) {
      team = await ctx.db
        .query("teams")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .first();
    }

    if (!team) {
      return {
        plan,
        isOwner: false,
        team: null,
        members: [],
        pendingInvites: [],
        seatUsage: { used: 0, total: 0 },
      };
    }

    const isOwner = team.ownerId === user._id;

    // Members = users whose teamId points at this team.
    const allUsers = await ctx.db.query("users").collect();
    const members = allUsers
      .filter((u) => u.teamId === team!._id || u._id === team!.ownerId)
      .map((u) => ({
        userId: u._id,
        name: u.name ?? null,
        email: u.email,
        role: u._id === team!.ownerId ? ("owner" as const) : ("member" as const),
      }));

    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", team!._id))
      .collect();
    const pendingInvites = invites
      .filter((i) => i.status === "pending")
      .map((i) => ({
        _id: i._id,
        email: i.email,
        createdAt: i.createdAt,
      }));

    const used = members.length;
    return {
      plan,
      isOwner,
      team: {
        _id: team._id,
        name: team.name,
        companyName: team.companyName ?? null,
        logoUrl: team.logoUrl ?? null,
        accentColor: team.accentColor ?? null,
        seats: team.seats,
        ownerId: team.ownerId,
      },
      members,
      pendingInvites,
      seatUsage: { used, total: team.seats },
    };
  },
});

export const inviteMember = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const team = await requireOwnedTeam(ctx, user);

    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Enter a valid email address");
    }

    // Seat check: current members + pending invites must stay within seats.
    const allUsers = await ctx.db.query("users").collect();
    const memberCount = allUsers.filter(
      (u) => u.teamId === team._id || u._id === team.ownerId
    ).length;
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    const pendingCount = invites.filter((i) => i.status === "pending").length;
    if (memberCount + pendingCount >= team.seats) {
      throw new Error("No seats available. All seats are in use.");
    }

    // Already a member?
    const existingUser = allUsers.find(
      (u) => u.email.toLowerCase() === email
    );
    if (existingUser && existingUser.teamId === team._id) {
      throw new Error("That person is already on your team");
    }
    if (existingUser && existingUser._id === team.ownerId) {
      throw new Error("You are the team owner");
    }

    // Already invited (pending)?
    const dupe = invites.find(
      (i) => i.email.toLowerCase() === email && i.status === "pending"
    );
    if (dupe) {
      throw new Error("That email already has a pending invite");
    }

    if (existingUser) {
      // Auto-link an existing user and mark the invite accepted immediately.
      if (existingUser.teamId && existingUser.teamId !== team._id) {
        throw new Error("That user already belongs to another team");
      }
      await ctx.db.patch(existingUser._id, { teamId: team._id });
      await ctx.db.insert("teamInvites", {
        teamId: team._id,
        email,
        invitedBy: user._id,
        status: "accepted",
        createdAt: Date.now(),
      });
      return { success: true, linked: true };
    }

    await ctx.db.insert("teamInvites", {
      teamId: team._id,
      email,
      invitedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });
    return { success: true, linked: false };
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const team = await requireOwnedTeam(ctx, user);
    if (args.memberId === team.ownerId) {
      throw new Error("The owner cannot be removed");
    }
    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== team._id) {
      throw new Error("Member not found on this team");
    }
    await ctx.db.patch(args.memberId, { teamId: undefined });
    return { success: true };
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("teamInvites") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const team = await requireOwnedTeam(ctx, user);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.teamId !== team._id) {
      throw new Error("Invite not found");
    }
    await ctx.db.patch(args.inviteId, { status: "revoked" });
    return { success: true };
  },
});

export const updateTeamBranding = mutation({
  args: {
    name: v.optional(v.string()),
    companyName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const team = await requireOwnedTeam(ctx, user);
    const patch: Partial<Doc<"teams">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Team name cannot be empty");
      patch.name = name.slice(0, 120);
    }
    if (args.companyName !== undefined) {
      patch.companyName = args.companyName.trim().slice(0, 120) || undefined;
    }
    if (args.logoUrl !== undefined) {
      patch.logoUrl = args.logoUrl.trim() || undefined;
    }
    if (args.accentColor !== undefined) {
      patch.accentColor = args.accentColor.trim() || undefined;
    }
    await ctx.db.patch(team._id, patch);
    return { success: true };
  },
});

/**
 * Called on login/sync: any pending invites matching the current user's email
 * are auto-accepted and the user is linked to the team (respecting seats).
 * Safe to call repeatedly.
 */
export async function acceptInvitesForCurrentUser(
  ctx: MutationCtx,
  user: Doc<"users">
): Promise<void> {
  if (user.teamId) return; // already on a team
  const email = user.email.toLowerCase();
  if (!email) return;

  const invites = await ctx.db
    .query("teamInvites")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  const pending = invites.filter((i) => i.status === "pending");
  if (pending.length === 0) return;

  // Take the most recent pending invite whose team still has a free seat.
  pending.sort((a, b) => b.createdAt - a.createdAt);
  for (const invite of pending) {
    const team = await ctx.db.get(invite.teamId);
    if (!team) continue;
    const allUsers = await ctx.db.query("users").collect();
    const memberCount = allUsers.filter(
      (u) => u.teamId === team._id || u._id === team.ownerId
    ).length;
    if (memberCount >= team.seats) continue;
    await ctx.db.patch(user._id, { teamId: team._id });
    await ctx.db.patch(invite._id, { status: "accepted" });
    return;
  }
}

/**
 * Team lead pool: aggregated leads across all team members. Owner-only and
 * gated to the business plan. Returns leads tagged with the owning member.
 */
export const getTeamLeads = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];
    if (effectivePlan(user) !== "business") return [];

    const team = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
    if (!team) return [];

    const allUsers = await ctx.db.query("users").collect();
    const memberIds = allUsers
      .filter((u) => u.teamId === team._id || u._id === team.ownerId)
      .map((u) => ({ id: u._id, name: u.name ?? u.email }));

    const out: Array<{
      _id: Id<"leads">;
      memberName: string;
      inquirerName: string;
      inquirerContact: string;
      propertyName?: string;
      status: "new" | "contacted" | "closed";
      createdAt: number;
    }> = [];

    for (const m of memberIds) {
      const leads = await ctx.db
        .query("leads")
        .withIndex("by_owner", (q) => q.eq("ownerId", m.id))
        .order("desc")
        .take(200);
      for (const l of leads) {
        out.push({
          _id: l._id,
          memberName: m.name,
          inquirerName: l.inquirerName,
          inquirerContact: l.inquirerContact,
          propertyName: l.propertyName,
          status: l.status,
          createdAt: l.createdAt,
        });
      }
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  },
});
