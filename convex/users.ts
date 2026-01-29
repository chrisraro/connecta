import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
    args: {
        email: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()), // Captured but not strictly used in current schema subset
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            // Update email if it changed (optional logic)
            if (existingUser.email !== args.email) {
                await ctx.db.patch(existingUser._id, { email: args.email });
            }
            return existingUser._id;
        }

        // Create new user
        const newUserId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            role: "agent", // Default role
            subscriptionStatus: "active", // Default to active for prototype
            credits: 5, // Free starting credits
        });

        return newUserId;
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
