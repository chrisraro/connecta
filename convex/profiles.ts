import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createProfile = mutation({
    args: {
        name: v.string(), // e.g., "My Luxury Profile"
        agentInfo: v.object({
            fullName: v.string(),
            title: v.string(),
            company: v.string(),
            phone: v.string(),
            email: v.string(),
            address: v.optional(v.string()),
            website: v.optional(v.string()),
            about: v.optional(v.string()),
            avatarUrl: v.optional(v.string()),
            services: v.optional(v.array(v.string())),
            socialLinks: v.array(v.object({ platform: v.string(), url: v.string() })),
        }),
        layoutConfig: v.object({
            themeId: v.string(),
            colorPalette: v.object({
                primary: v.string(),
                background: v.string(),
                text: v.string(),
            }),
            componentOrder: v.array(v.string()),
            heroStyle: v.string(),
        }),
        featuredProperties: v.array(v.id("properties")),
        featuredProjects: v.optional(v.array(v.string())),
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        const profileId = await ctx.db.insert("profiles", {
            ownerId: user._id,
            name: args.name,
            agentInfo: args.agentInfo,
            layoutConfig: args.layoutConfig,
            featuredProperties: args.featuredProperties,
            featuredProjects: args.featuredProjects || [],
        });

        return profileId;
    },
});

export const getProfile = query({
    args: { profileId: v.id("profiles") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.profileId);
    },
});

// Helper to get all profiles for the dashboard
export const getMyProfiles = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("profiles")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});
