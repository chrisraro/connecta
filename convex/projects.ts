import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const categoryValidator = v.union(
    v.literal("graphic-design"),
    v.literal("web-design"),
    v.literal("photography"),
    v.literal("video"),
    v.literal("branding"),
    v.literal("case-study"),
    v.literal("development"),
    v.literal("ui-ux"),
    v.literal("real-estate"),
    v.literal("other")
);

export const getProjects = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();

        if (!user) return [];

        return ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .order("desc")
            .collect();
    },
});

export const createProject = mutation({
    args: {
        clerkId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        category: categoryValidator,
        tags: v.array(v.string()),
        images: v.array(v.string()),
        externalUrl: v.optional(v.string()),
        caseStudyUrl: v.optional(v.string()),
        featured: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) throw new Error("User not found");

        const { clerkId, ...projectFields } = args;
        return ctx.db.insert("projects", {
            ownerId: user._id,
            ...projectFields,
            createdAt: Date.now(),
        });
    },
});

export const updateProject = mutation({
    args: {
        id: v.id("projects"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(categoryValidator),
        tags: v.optional(v.array(v.string())),
        images: v.optional(v.array(v.string())),
        externalUrl: v.optional(v.string()),
        caseStudyUrl: v.optional(v.string()),
        featured: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        await ctx.db.patch(id, fields);
    },
});

export const deleteProject = mutation({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
