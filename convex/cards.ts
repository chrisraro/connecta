import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

async function getUser(ctx: QueryCtx, clerkId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
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
        const user = await getUser(ctx, args.clerkId);
        if (!user) throw new Error("User not found");

        const card = await ctx.db
            .query("cards")
            .withIndex("by_activationCode", (q) => q.eq("activationCode", args.activationCode))
            .first();

        if (!card) throw new Error("Invalid activation code");
        if (card.status !== "inventory") throw new Error("Card already activated or reported lost");

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
        const user = await getUser(ctx, args.clerkId);
        if (!user) throw new Error("User not found");

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
        console.log("claimCardByUuid called:", { clerkId: args.clerkId, uuid: args.uuid });
        
        // Get or create user
        let user = await getUser(ctx, args.clerkId);
        
        if (!user) {
            console.log("User not found, creating new user...", args.clerkId);
            // User doesn't exist in Convex yet - create them
            // This happens when user just signed up via Clerk
            const newUserId = await ctx.db.insert("users", {
                clerkId: args.clerkId,
                email: "", // Will be updated during onboarding
                role: "agent",
                subscriptionStatus: "active",
                credits: 5,
                onboardingCompleted: false,
            });
            
            user = await ctx.db.get(newUserId);
            if (!user) {
                console.error("Failed to retrieve newly created user");
                throw new Error("Failed to create user");
            }
            console.log("New user created:", user._id);
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
            console.error("Card not found for UUID:", args.uuid);
            throw new Error("Card not found");
        }

        console.log("Card found:", { 
            cardId: card._id, 
            status: card.status, 
            currentOwnerId: card.ownerId 
        });

        // If card already belongs to this user and is active, return it (idempotent)
        if (card.ownerId === user._id && card.status === "active") {
            console.log("Card already claimed by this user, returning existing card");
            return card._id;
        }

        // If card belongs to another user, reject
        if (card.ownerId && card.ownerId !== user._id) {
            console.error("Card belongs to another user");
            throw new Error("Card is not available for claiming");
        }

        // If card is not in inventory status, reject
        if (card.status !== "inventory") {
            console.error("Card is not in inventory status:", card.status);
            throw new Error("Card is not available for claiming");
        }

        // Claim the card: assign ownership and activate
        console.log("Claiming card for user:", user._id);
        await ctx.db.patch(card._id, {
            ownerId: user._id,
            status: "active",
        });

        console.log("Card claimed successfully:", card._id);
        return card._id;
    },
});
