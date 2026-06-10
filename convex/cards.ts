import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUserMatching } from "./authz";
import { planContext } from "./billing";

async function getUser(ctx: QueryCtx, clerkId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
}

// Throws if activating one more card would exceed the user's plan limit on
// active cards. Free = 1 active card; paid plans = unlimited.
async function assertCanActivateCard(ctx: MutationCtx, user: Doc<"users">) {
    const { limits } = planContext(user);
    if (limits.maxActiveCards === null) return;
    const owned = await ctx.db
        .query("cards")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
    const activeCount = owned.filter((c) => c.status === "active").length;
    if (activeCount >= limits.maxActiveCards) {
        throw new Error("Upgrade to Pro to activate more than one card.");
    }
}

export const getByActivationCode = query({
    args: { activationCode: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("cards")
            .withIndex("by_activationCode", (q) => q.eq("activationCode", args.activationCode))
            .first();
    },
});

export const activateCard = mutation({
    args: {
        clerkId: v.string(),
        activationCode: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const card = await ctx.db
            .query("cards")
            .withIndex("by_activationCode", (q) => q.eq("activationCode", args.activationCode))
            .first();

        if (!card) throw new Error("Invalid activation code");
        if (card.status !== "inventory") throw new Error("Card already activated or reported lost");

        await assertCanActivateCard(ctx, user);

        await ctx.db.patch(card._id, {
            ownerId: user._id,
            status: "active",
        });

        return card._id;
    },
});

export const linkProfile = mutation({
    args: {
        clerkId: v.string(),
        cardId: v.id("cards"),
        profileId: v.optional(v.id("profiles")),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const card = await ctx.db.get(args.cardId);
        if (!card) throw new Error("Card not found");
        if (card.ownerId !== user._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.cardId, {
            linkedProfileId: args.profileId,
        });
    },
});

export const getCardByUuid = query({
    args: { uuid: v.string() },
    handler: async (ctx, args) => {
        // 1. Try exact match (fastest)
        let card = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
            .first();

        // 2. Try decoded match (handles %3A colons)
        if (!card) {
            const decoded = decodeURIComponent(args.uuid);
            if (decoded !== args.uuid) {
                card = await ctx.db
                    .query("cards")
                    .withIndex("by_uuid", (q) => q.eq("uuid", decoded))
                    .first();
            }
        }

        // 3. Try case-insensitive match (handles lowercase/uppercase hex mismatches)
        if (!card) {
            const normalized = decodeURIComponent(args.uuid).toLowerCase();
            card = await ctx.db
                .query("cards")
                .collect()
                .then(cards => cards.find(c => c.uuid.toLowerCase() === normalized) || null);
        }

        return card;
    },
});

export const incrementTapCount = mutation({
    args: { cardId: v.id("cards") },
    handler: async (ctx, args) => {
        const card = await ctx.db.get(args.cardId);
        if (card) {
            await ctx.db.patch(args.cardId, {
                tapCount: card.tapCount + 1,
            });
        }
    },
});

export const claimCardByUuid = mutation({
    args: {
        clerkId: v.string(),
        uuid: v.string(),
    },
    handler: async (ctx, args) => {
        // SECURITY: enforce that the claimed clerkId belongs to the authenticated
        // caller before creating/claiming anything in their name.
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized: authentication required");
        if (identity.subject !== args.clerkId) throw new Error("Unauthorized: identity mismatch");

        // Get or create user
        let user = await getUser(ctx, args.clerkId);

        if (!user) {
            // User doesn't exist in Convex yet - create them.
            // This happens when user just signed up via Clerk.
            const newUserId = await ctx.db.insert("users", {
                clerkId: args.clerkId,
                email: "", // Will be updated during onboarding
                role: "agent",
                subscriptionStatus: "active",
                credits: 5,
                plan: "free",
                onboardingCompleted: false,
            });

            user = await ctx.db.get(newUserId);
            if (!user) {
                throw new Error("Failed to create user");
            }
        }

        // Find the card by UUID (with decoded and case-insensitive fallbacks)
        let card = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
            .first();

        if (!card) {
            const decoded = decodeURIComponent(args.uuid);
            if (decoded !== args.uuid) {
                card = await ctx.db
                    .query("cards")
                    .withIndex("by_uuid", (q) => q.eq("uuid", decoded))
                    .first();
            }
        }

        if (!card) {
            throw new Error("Card not found");
        }

        // If card already belongs to this user and is active, return it (idempotent)
        if (card.ownerId === user._id && card.status === "active") {
            return card._id;
        }

        // If card belongs to another user, reject
        if (card.ownerId && card.ownerId !== user._id) {
            throw new Error("Card is not available for claiming");
        }

        // If card is not in inventory status, reject
        if (card.status !== "inventory") {
            throw new Error("Card is not available for claiming");
        }

        // Plan gating: free plan may only have one active card.
        await assertCanActivateCard(ctx, user);

        // Claim the card: assign ownership and activate
        await ctx.db.patch(card._id, {
            ownerId: user._id,
            status: "active",
        });

        return card._id;
    },
});
