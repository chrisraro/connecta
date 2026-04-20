import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

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

        const isAdmin = args.email === "tapfolio.dev@gmail.com";

        if (existingUser) {
            const updates: Partial<Doc<"users">> = {};
            if (existingUser.email !== args.email) {
                updates.email = args.email;
            }
            if (isAdmin && existingUser.role !== "admin") {
                updates.role = "admin";
            }
            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(existingUser._id, updates);
            }
            return { id: existingUser._id, role: isAdmin ? "admin" : existingUser.role };
        }

        const newUserId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            role: isAdmin ? "admin" : "agent",
            subscriptionStatus: "active",
            credits: 5,
            onboardingCompleted: false,
        });

        return { id: newUserId, role: isAdmin ? "admin" : "agent" };
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

        // Auto-create a default profile when onboarding is completed
        let profileId: string | null = null;
        if (args.markCompleted) {
            // Check if user already has a profile
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

                profileId = await ctx.db.insert("profiles", {
                    ownerId: user._id,
                    name: `${args.fullName}'s Profile`,
                    profileType: profileType,
                    agentInfo: {
                        fullName: args.fullName,
                        title: args.title,
                        company: args.company || "",
                        phone: args.phone,
                        email: args.email || "",
                        address: undefined,
                        website: args.website,
                        about: args.about,
                        avatarUrl: args.avatarUrl,
                        services: args.services,
                        socialLinks: args.socialLinks || [],
                    },
                    layoutConfig: {
                        themeId: profileType === "business" ? "architectural" : profileType === "company" ? "kinetic" : "editorial",
                        colorPalette: themeColors,
                        componentOrder: ["Hero", "About", "Services", "Projects", "Contact"],
                        heroStyle: "default",
                    },
                    featuredProperties: [],
                    featuredProjects: [],
                });
            } else {
                // Return the first existing profile ID
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

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("cards")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});
