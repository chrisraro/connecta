import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createProfile = mutation({
    args: {
        name: v.string(), // e.g., "My Luxury Profile"
        profileType: v.optional(v.union(v.literal("individual"), v.literal("company"), v.literal("business"))),
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
            certification: v.optional(v.object({
                title: v.string(),
                description: v.string(),
            })),
            education: v.optional(v.array(v.object({
                degree: v.string(),
                school: v.string(),
                year: v.optional(v.string()),
            }))),
            techStack: v.optional(v.array(v.object({
                category: v.string(),
                skills: v.array(v.string()),
            }))),
            experience: v.optional(v.array(v.object({
                title: v.string(),
                company: v.string(),
                period: v.string(),
                description: v.optional(v.string()),
            }))),
            testimonials: v.optional(v.array(v.object({
                quote: v.string(),
                author: v.string(),
                role: v.optional(v.string()),
            }))),
            gallery: v.optional(v.array(v.string())),
        }),
        layoutConfig: v.object({
            themeId: v.string(),
            colorPalette: v.object({
                primary: v.string(),
                background: v.string(),
                text: v.string(),
                secondary: v.optional(v.string()),
                accent: v.optional(v.string()),
            }),
            componentOrder: v.array(v.string()),
            heroStyle: v.string(),
        }),
        featuredProperties: v.array(v.id("properties")),
        featuredProjects: v.optional(v.array(v.string())),
        products: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            price: v.optional(v.number()),
            image: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        services: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            price: v.optional(v.number()),
            image: v.optional(v.string()),
        }))),
        propertyListings: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            price: v.optional(v.string()),
            location: v.optional(v.string()),
            image: v.optional(v.string()),
            status: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        inlineProjects: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            category: v.optional(v.string()),
            image: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        clerkId: v.string(),
        id: v.optional(v.id("profiles")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        const profileData = {
            ownerId: user._id,
            name: args.name,
            profileType: args.profileType,
            agentInfo: args.agentInfo,
            layoutConfig: args.layoutConfig,
            featuredProperties: args.featuredProperties,
            featuredProjects: args.featuredProjects || [],
            products: args.products,
            services: args.services,
            propertyListings: args.propertyListings,
            inlineProjects: args.inlineProjects,
        };

        if (args.id) {
            const existing = await ctx.db.get(args.id);
            if (!existing || existing.ownerId !== user._id) {
                throw new Error("Unauthorized or profile not found");
            }
            await ctx.db.patch(args.id, profileData);
            return args.id;
        }

        const profileId = await ctx.db.insert("profiles", profileData);
        return profileId;
    },
});

export const deleteProfile = mutation({
    args: { profileId: v.id("profiles"), clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) throw new Error("User not found");

        const profile = await ctx.db.get(args.profileId);
        if (!profile || profile.ownerId !== user._id) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.profileId);
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
