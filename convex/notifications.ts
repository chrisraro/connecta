import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireUserMatching } from "./authz";

export const get = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];
    const user = await requireUserMatching(ctx, args.clerkId);
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
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Unauthorized: notification not found or not owned by caller");
    }
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUserMatching(ctx, args.clerkId);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});
