import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";

export const generateUploadUrl = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is an admin
    await requireAdmin(ctx, args.clerkId);
    
    // Generate upload URL for authenticated admin users
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return uploadUrl;
  },
});

export const getImageUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        try {
            const url = await ctx.storage.getUrl(args.storageId);
            return url;
        } catch (error) {
            console.error("Failed to get image URL:", error);
            return null;
        }
    },
});
