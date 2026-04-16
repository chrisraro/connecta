import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique();

        if (!user) return [];

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .order("desc")
            .take(20);

        return notifications;
    },
});

export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, { read: true });
    },
});

export const markAllAsRead = mutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) return;

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
            .collect();

        for (const notification of unreadNotifications) {
            await ctx.db.patch(notification._id, { read: true });
        }
    },
});
