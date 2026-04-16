import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Leads Management
export const createLead = mutation({
    args: {
        ownerId: v.id("users"),
        propertyId: v.optional(v.id("properties")),
        propertyName: v.optional(v.string()),
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

        // Insert a notification for the profile owner
        await ctx.db.insert("notifications", {
            userId: args.ownerId,
            type: "new_lead",
            read: false,
            title: "New Lead Inquiry",
            message: `${args.inquirerName} has sent you a message!`,
            link: "/dashboard/leads",
            data: { leadId, inquirerName: args.inquirerName },
            createdAt: Date.now(),
        });

        // Trigger email sending
        const user = await ctx.db.get(args.ownerId);
        if (user && user.email) {
            await ctx.scheduler.runAfter(0, internal.email.sendLeadNotification, {
                toEmail: user.email,
                inquirerName: args.inquirerName,
                inquirerContact: args.inquirerContact,
                propertyName: args.propertyName,
                message: args.message,
            });
        }

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
