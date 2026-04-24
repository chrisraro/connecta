import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized: Must be logged in to upload images");
        }
        
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
