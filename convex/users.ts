import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUserMatching } from "./authz";
import { acceptInvitesForCurrentUser } from "./teams";
import { logAudit } from "./audit";
import { insertNewProfile } from "./profiles";
import { DEFAULT_DIGITAL_CARD } from "../lib/digitalCard";
import { internal } from "./_generated/api";

export const syncUser = mutation({
    args: {
        email: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized: authentication required");
        if (identity.subject !== args.clerkId) throw new Error("Unauthorized: identity mismatch");

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            const updates: Partial<Doc<"users">> = {};
            if (existingUser.email !== args.email) {
                updates.email = args.email;
            }
            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(existingUser._id, updates);
            }
            // Auto-accept any pending team invites matching this email.
            const fresh = await ctx.db.get(existingUser._id);
            if (fresh) await acceptInvitesForCurrentUser(ctx, fresh);
            return { id: existingUser._id, role: existingUser.role };
        }

        const newUserId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            role: "agent",
            subscriptionStatus: "active",
            plan: "free",
            onboardingCompleted: false,
        });

        const newUser = await ctx.db.get(newUserId);
        if (newUser) await acceptInvitesForCurrentUser(ctx, newUser);

        return { id: newUserId, role: "agent" };
    },
});

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

export const getOnboardingStatus = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return { completed: false, data: null };
        const user = await requireUserMatching(ctx, args.clerkId);
        return {
            completed: user.onboardingCompleted ?? false,
            data: user.onboardingData ?? null,
        };
    },
});

export const updateOnboarding = mutation({
    args: {
        clerkId: v.string(),
        profileCategory: v.optional(v.union(v.literal("individual"), v.literal("company"), v.literal("business"))),
        email: v.optional(v.string()),
        fullName: v.string(),
        title: v.string(),
        company: v.optional(v.string()),
        phone: v.string(),
        website: v.optional(v.string()),
        about: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        services: v.array(v.string()),
        socialLinks: v.optional(v.array(v.object({ platform: v.string(), url: v.string() }))),
        markCompleted: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        await ctx.db.patch(user._id, {
            name: args.fullName,
            onboardingData: {
                profileCategory: args.profileCategory,
                email: args.email,
                fullName: args.fullName,
                title: args.title,
                company: args.company,
                phone: args.phone,
                website: args.website,
                about: args.about,
                avatarUrl: args.avatarUrl,
                services: args.services,
                socialLinks: args.socialLinks,
            },
            ...(args.markCompleted ? { onboardingCompleted: true } : {}),
        });

        let profileId: Id<"profiles"> | null = null;
        if (args.markCompleted) {
            const existingProfiles = await ctx.db
                .query("profiles")
                .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
                .collect();

            if (existingProfiles.length === 0) {
                const profileType = args.profileCategory || "individual";
                const themeColors = profileType === "business"
                    ? { primary: "#00193c", background: "#f7f9fb", text: "#191c1e" }
                    : profileType === "company"
                        ? { primary: "#ba9eff", background: "#0e0e0e", text: "#ffffff" }
                        : { primary: "#705838", background: "#fbf9f4", text: "#1b1c19" };

                // THE fix for Task 12: go through the exact same write path
                // the builder's own `createProfile` uses (insertNewProfile,
                // convex/profiles.ts), instead of a parallel, silently
                // divergent `ctx.db.insert`. That old direct insert never
                // assigned a slug and never seeded a digitalCard — see
                // insertNewProfile's doc comment for the full history.
                const created = await insertNewProfile(ctx, user._id, {
                    name: `${args.fullName}'s Profile`,
                    profileType,
                    agentInfo: {
                        fullName: args.fullName,
                        title: args.title,
                        company: args.company || "",
                        phone: args.phone,
                        email: args.email || "",
                        website: args.website,
                        about: args.about,
                        avatarUrl: args.avatarUrl,
                        services: args.services,
                        socialLinks: args.socialLinks || [],
                    },
                    layoutConfig: {
                        themeId: profileType === "business" ? "architectural" : profileType === "company" ? "kinetic" : "editorial",
                        colorPalette: themeColors,
                        // "individual" is the only type whose default layout
                        // doesn't already include Services — but onboarding's
                        // service-tag step (app/dashboard/onboarding/page.tsx)
                        // is offered to every profile type, individual
                        // included. Omitting the block unconditionally meant
                        // a fresh individual profile's onboarding-collected
                        // services were hidden the instant onboarding
                        // finished, indistinguishable in the builder's
                        // Sections list from a block the user chose to hide
                        // (Task 13). Include it whenever there's real data.
                        componentOrder: profileType === "business"
                            ? ["Hero", "About", "Services", "Products", "Properties", "Gallery", "Contact"]
                            : profileType === "company"
                                ? ["Hero", "About", "Services", "Projects", "Products", "Contact"]
                                : [
                                    "Hero", "About",
                                    ...(args.services.length > 0 ? ["Services"] : []),
                                    "Experience", "Education", "Projects", "Contact",
                                  ],
                        heroStyle: "default",
                    },
                    digitalCard: DEFAULT_DIGITAL_CARD,
                });
                profileId = created.id;
            } else {
                profileId = existingProfiles[0]._id;
            }
        }

        return { userId: user._id, profileId };
    },
});

export const getMyCards = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];
        const user = await requireUserMatching(ctx, args.clerkId);
        return await ctx.db
            .query("cards")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});

/**
 * Strips the deprecated `credits` field from user documents.
 *
 * `credits` was a token balance for an AI-generation feature that was removed
 * in 79d6e7c without a data migration, leaving orphan values on live rows.
 * `convex/schema.ts` currently declares it optional only so schema validation
 * accepts those rows — once this migration reports `isDone: true`, that field
 * declaration can be deleted.
 *
 * Idempotent and paginated. Call repeatedly, feeding `cursor` back in:
 *   npx convex run users:internalStripLegacyCredits '{}'
 *   npx convex run users:internalStripLegacyCredits '{"cursor":"<cursor>"}'
 */
export const internalStripLegacyCredits = internalMutation({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const numItems = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
        const page = await ctx.db
            .query("users")
            .paginate({ cursor: args.cursor ?? null, numItems });

        let stripped = 0;
        for (const user of page.page) {
            if ((user as { credits?: number }).credits === undefined) continue;
            await ctx.db.patch(user._id, { credits: undefined });
            stripped++;
        }

        return {
            scanned: page.page.length,
            stripped,
            isDone: page.isDone,
            cursor: page.isDone ? null : page.continueCursor,
        };
    },
});

/**
 * Shared account-erasure primitive (RA 10173 erasure right).
 *
 * The security audit that produced app/privacy and app/terms found there was
 * NO erasure path anywhere in this codebase. This internal mutation is the
 * data-erasure half of that fix, and — per a later audit finding — the
 * SINGLE place that erasure logic lives: it is called both by the
 * self-service `deleteMyAccount` action below (the Settings page's "Delete
 * Account" button) AND by the Clerk webhook handler in convex/http.ts for
 * accounts removed any other way (Clerk dashboard, Backend API, a user's own
 * Clerk-hosted account portal). Before this factor-out, only the app's own
 * delete button erased Convex data — any other deletion path orphaned the
 * user's rows forever, an erasure gap approached from the opposite direction
 * of the same RA-10173 problem.
 *
 * IDENTITY MODEL
 * --------------
 *  - Takes `clerkId` directly rather than deriving it from `ctx.auth`,
 *    because the webhook caller has no authenticated session for the
 *    account being deleted — Clerk itself is the trusted source of which
 *    identity was removed. This is safe because the function is
 *    `internalMutation`: it is not part of the public API surface, so it can
 *    only be invoked from other server-side Convex code (the `deleteMyAccount`
 *    action, which derives `clerkId` from the caller's own verified
 *    `ctx.auth` identity — never a client-supplied argument — and the
 *    webhook handler, which only reaches this call after verifying Clerk's
 *    Svix signature).
 *  - Idempotent: a `clerkId` with no matching `users` row is a no-op, not an
 *    error. This matters for the webhook (a retried `user.deleted` delivery,
 *    or a Clerk user that was never synced into Convex in the first place)
 *    and for a caller who double-clicks "Delete Account".
 *
 * REFERENCE GRAPH
 * ----------------
 * This reuses the reference graph enumerated in convex/maintenance.ts
 * (internalPurgeTestAccounts), which walks every table that points at
 * `users` rather than deleting the user row alone and orphaning its
 * dependents:
 *  - profiles, leads, notifications, properties, projects, carts,
 *    subscriptionInvoices, orders: deleted outright — this is the user's own
 *    data, with no other party's rights attached to it.
 *  - cards: NEVER deleted. They are real hardware sitting in the physical
 *    world; deleting the row would not reclaim the object. They are
 *    returned to unassigned inventory (status "inventory", tap count reset,
 *    link to the now-deleted profile cleared) so they can be reissued.
 *  - auditLogs: deliberately RETAINED, including a final entry recording
 *    the deletion itself. An audit trail that erases itself when its
 *    subject is removed is not an audit trail — this is the one category of
 *    "personal data" that legitimately survives account deletion as a
 *    security record.
 *  - admins: any admin grant belonging to this user is revoked/removed too,
 *    since it is specifically about this person, not shared data.
 *
 * KNOWN LIMITATION (documented rather than papered over): this does not
 * handle team ownership. If the caller owns a `teams` row, that team and its
 * `teamInvites` are left as-is — reassigning or winding down a shared team
 * workspace is a separate, harder problem (other members have a stake in
 * that data) than erasing one person's own records, and is out of scope for
 * this pass.
 */
export const internalEraseUserByClerkId = internalMutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) {
            // Idempotent no-op — see IDENTITY MODEL above.
            return {
                success: true as const,
                found: false as const,
                deleted: {
                    profiles: 0,
                    leads: 0,
                    notifications: 0,
                    properties: 0,
                    projects: 0,
                    carts: 0,
                    invoices: 0,
                    orders: 0,
                    adminGrants: 0,
                },
                cardsReturnedToInventory: 0,
            };
        }

        const userId = user._id;

        const [
            profiles,
            cards,
            leads,
            notifications,
            properties,
            projects,
            carts,
            invoices,
            orders,
            adminGrants,
        ] = await Promise.all([
            ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
            ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
            ctx.db.query("leads").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
            ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
            ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
            ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
            ctx.db.query("carts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
            ctx.db.query("subscriptionInvoices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
            ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
            ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ]);

        // Record the deletion in the (retained) audit trail before the user
        // row disappears, so there is a durable record of who requested it
        // and when — and what it touched.
        await logAudit(ctx, {
            userId,
            action: "delete",
            resourceType: "user",
            resourceId: userId,
            changes: {
                profilesDeleted: profiles.length,
                leadsDeleted: leads.length,
                notificationsDeleted: notifications.length,
                propertiesDeleted: properties.length,
                projectsDeleted: projects.length,
                cartsDeleted: carts.length,
                invoicesDeleted: invoices.length,
                ordersDeleted: orders.length,
                cardsReturnedToInventory: cards.length,
            },
        });

        for (const p of profiles) await ctx.db.delete(p._id);
        for (const l of leads) await ctx.db.delete(l._id);
        for (const n of notifications) await ctx.db.delete(n._id);
        for (const p of properties) await ctx.db.delete(p._id);
        for (const p of projects) await ctx.db.delete(p._id);
        for (const c of carts) await ctx.db.delete(c._id);
        for (const i of invoices) await ctx.db.delete(i._id);
        for (const o of orders) await ctx.db.delete(o._id);
        for (const a of adminGrants) await ctx.db.delete(a._id);

        // Physical cards survive as unassigned inventory — never deleted.
        for (const c of cards) {
            await ctx.db.patch(c._id, {
                status: "inventory",
                linkedProfileId: undefined,
                tapCount: 0,
            });
        }

        // auditLogs are deliberately RETAINED (see doc comment above).

        await ctx.db.delete(userId);

        return {
            success: true as const,
            found: true as const,
            deleted: {
                profiles: profiles.length,
                leads: leads.length,
                notifications: notifications.length,
                properties: properties.length,
                projects: projects.length,
                carts: carts.length,
                invoices: invoices.length,
                orders: orders.length,
                adminGrants: adminGrants.length,
            },
            cardsReturnedToInventory: cards.length,
        };
    },
});

/**
 * Self-service account deletion — the Settings page's "Delete Account"
 * button, and the fix for the audit's Critical finding: the dialog claims
 * permanent deletion "per privacy regulations (RA 10173)", but the old
 * implementation only erased Convex data and never touched the Clerk
 * identity. The user could sign back in immediately and `syncUser` would
 * silently recreate the "deleted" account.
 *
 * This is an `action`, not a `mutation`, because deleting the Clerk identity
 * requires an outbound `fetch` call (Clerk Backend API), and Convex
 * mutations cannot make network calls. It orchestrates two steps:
 *
 *   1. Erase Convex data via `internalEraseUserByClerkId` — a single atomic
 *      mutation call, so that half of the operation keeps the all-or-nothing
 *      guarantee Convex mutations normally provide.
 *   2. Delete the Clerk identity via `DELETE /v1/users/{id}` using
 *      `CLERK_SECRET_KEY` from Convex env.
 *
 * `CLERK_SECRET_KEY` is UNSET in this deployment today, which makes step 2's
 * degraded path the common case, not a rare edge case. When it's missing (or
 * Clerk's API call itself fails), this function still returns
 * `success: true` for the data erasure — that part genuinely succeeded and
 * is not rolled back — but reports `identityDeletion.status` as
 * `"pending_configuration"` or `"failed"` rather than silently claiming a
 * complete deletion the user was promised. Callers (the Settings page) MUST
 * branch on `identityDeletion.status`, not just `success`, before telling
 * the user their account is fully gone.
 *
 * SAFETY MODEL: identical to before — the caller can only ever delete
 * themselves. `clerkId` comes from `ctx.auth.getUserIdentity()`, never from
 * a client-supplied argument, so there is nothing to spoof.
 */
export const deleteMyAccount = action({
    args: {},
    handler: async (
        ctx
    ): Promise<{
        success: true;
        found: boolean;
        deleted: {
            profiles: number;
            leads: number;
            notifications: number;
            properties: number;
            projects: number;
            carts: number;
            invoices: number;
            orders: number;
            adminGrants: number;
        };
        cardsReturnedToInventory: number;
        identityDeletion: {
            status: "deleted" | "pending_configuration" | "failed";
            message: string;
        };
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized: authentication required");
        }
        const clerkId = identity.subject;

        // Step 1: erase Convex data. This commits as its own atomic
        // transaction — it is not rolled back by anything that happens
        // afterward, including a failed or unconfigured Clerk API call.
        const erasure = await ctx.runMutation(
            internal.users.internalEraseUserByClerkId,
            { clerkId }
        );

        // Step 2: delete the Clerk identity.
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.error(
                "deleteMyAccount: CLERK_SECRET_KEY is not configured — Convex data was erased but the Clerk identity was not deleted"
            );
            return {
                ...erasure,
                identityDeletion: {
                    status: "pending_configuration",
                    message:
                        "Your data was deleted. Identity removal is pending configuration — contact support if this persists.",
                },
            };
        }

        const res = await fetch(
            `https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${secretKey}` },
            }
        );

        // A 404 means the identity is already gone (a prior retry, or the
        // webhook beat this call to it) — that is a completed deletion, not
        // a failure.
        if (!res.ok && res.status !== 404) {
            console.error("deleteMyAccount: Clerk identity deletion failed", {
                status: res.status,
            });
            return {
                ...erasure,
                identityDeletion: {
                    status: "failed",
                    message:
                        "Your data was deleted, but identity removal failed. Contact support.",
                },
            };
        }

        return {
            ...erasure,
            identityDeletion: {
                status: "deleted",
                message: "Your account and identity were permanently deleted.",
            },
        };
    },
});
