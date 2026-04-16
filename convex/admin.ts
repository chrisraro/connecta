import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to check admin access
async function checkAdmin(ctx: QueryCtx, clerkId?: string) {
    if (!clerkId) throw new Error("Unauthorized");
    const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
    if (!user || user.role !== "admin") {
        throw new Error("Admin access required");
    }
    return user;
}

export const getDashboardStats = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await checkAdmin(ctx, args.clerkId);

        const users = await ctx.db.query("users").collect();
        const cards = await ctx.db.query("cards").collect();
        const leads = await ctx.db.query("leads").collect();

        return {
            totalUsers: users.length,
            inventoryCards: cards.filter(c => c.status === "inventory").length,
            activeCards: cards.filter(c => c.status === "active").length,
            totalLeads: leads.length,
        };
    },
});

export const getAllUsers = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await checkAdmin(ctx, args.clerkId);
        
        const users = await ctx.db.query("users").order("desc").collect();
        return users.map(u => ({
            id: u._id,
            email: u.email,
            name: u.name || "N/A",
            role: u.role,
            credits: u.credits,
            onboardingCompleted: u.onboardingCompleted ?? false,
        }));
    },
});

export const getCards = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await checkAdmin(ctx, args.clerkId);
        return await ctx.db.query("cards").order("desc").collect();
    },
});

function generateRandomString(length: number, isHex = false) {
    const chars = isHex ? '0123456789abcdef' : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateUUID() {
    return 'xxxx-xxxx-xxxx'.replace(/[x]/g, function () {
        const r = Math.random() * 16 | 0;
        return r.toString(16);
    });
}

export const registerSingleCard = mutation({
    args: {
        clerkId: v.optional(v.string()),
        uuid: v.string(), // The hardware UID read from the NFC tag
    },
    handler: async (ctx, args) => {
        const adminUser = await checkAdmin(ctx, args.clerkId);

        // Check if card already exists
        const existing = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
            .first();
        
        if (existing) {
            throw new Error("This card is already registered in the system.");
        }

        const activationCode = generateRandomString(6);
        
        const cardId = await ctx.db.insert("cards", {
            ownerId: adminUser._id,
            uuid: args.uuid,
            activationCode: activationCode,
            status: "inventory",
            tapCount: 0,
        });
        
        return { id: cardId, uuid: args.uuid, activationCode };
    },
});

export const bulkRegisterCards = mutation({
    args: {
        clerkId: v.optional(v.string()),
        quantity: v.number(),
    },
    handler: async (ctx, args) => {
        const adminUser = await checkAdmin(ctx, args.clerkId);

        const newCards = [];
        for (let i = 0; i < args.quantity; i++) {
            const uuid = generateUUID();
            const activationCode = generateRandomString(6);
            
            const cardId = await ctx.db.insert("cards", {
                ownerId: adminUser._id, // Assign generically to admin initially
                uuid: uuid,
                activationCode: activationCode,
                status: "inventory",
                tapCount: 0,
            });
            
            newCards.push({ id: cardId, uuid, activationCode });
        }
        
        return newCards;
    },
});

export const deleteCards = mutation({
    args: {
        clerkId: v.optional(v.string()),
        cardIds: v.array(v.id("cards")),
    },
    handler: async (ctx, args) => {
        await checkAdmin(ctx, args.clerkId);

        for (const id of args.cardIds) {
            await ctx.db.delete(id);
        }
    },
});
