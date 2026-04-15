import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
    args: {
        email: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            if (existingUser.email !== args.email) {
                await ctx.db.patch(existingUser._id, { email: args.email });
            }
            return existingUser._id;
        }

        const newUserId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            role: "agent",
            subscriptionStatus: "active",
            credits: 5,
            onboardingCompleted: false,
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

export const getOnboardingStatus = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return { completed: false, data: null };

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();

        if (!user) return { completed: false, data: null };

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
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) throw new Error("User not found");

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

        return user._id;
    },
});
