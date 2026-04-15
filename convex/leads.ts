import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Leads Management
export const createLead = mutation({
    args: {
        ownerId: v.id("users"),
        propertyId: v.id("properties"),
        propertyName: v.string(),
        inquirerName: v.string(),
        inquirerContact: v.string(),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const leadId = await ctx.db.insert("leads", {
            ownerId: args.ownerId,
            propertyId: args.propertyId,
            propertyName: args.propertyName,
            inquirerName: args.inquirerName,
            inquirerContact: args.inquirerContact,
            message: args.message,
            status: "new",
            createdAt: Date.now(),
        });
        return leadId;
    },
});

export const getLeads = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();
        if (!user) return [];

        const leads = await ctx.db
            .query("leads")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .order("desc")
            .collect();

        return leads;
    },
});

export const markContacted = mutation({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.leadId, {
            status: "contacted",
            lastContactedAt: Date.now(),
        });
    },
});
