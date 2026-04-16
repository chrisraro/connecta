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
        const card = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
            .first();
        
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
