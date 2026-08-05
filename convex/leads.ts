import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { sanitizePlainText } from "../lib/sanitize";
import { requireUser, requireUserMatching } from "./authz";
import { planContext } from "./billing";
import { checkRateLimit } from "./rateLimit";

const MAX_NAME = 120;
const MAX_CONTACT = 200;
const MAX_MESSAGE = 2000;
const MAX_PROPERTY_NAME = 200;

function capLen(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
}

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
        await checkRateLimit(ctx, `lead:${args.ownerId}`, { max: 5, windowMs: 60_000 });
        const owner = await ctx.db.get(args.ownerId);
        if (!owner) {
            throw new Error("Invalid recipient");
        }
        if (!args.inquirerName.trim() || !args.inquirerContact.trim()) {
            throw new Error("Name and contact are required");
        }
        const sanitizedName = capLen(sanitizePlainText(args.inquirerName), MAX_NAME);
        const sanitizedContact = capLen(sanitizePlainText(args.inquirerContact), MAX_CONTACT);
        const sanitizedMessage = args.message
            ? capLen(sanitizePlainText(args.message), MAX_MESSAGE)
            : undefined;
        const sanitizedPropertyName = args.propertyName
            ? capLen(sanitizePlainText(args.propertyName), MAX_PROPERTY_NAME)
            : undefined;

        // NOTE: leads are ALWAYS captured (never lost), regardless of plan. The
        // Free plan only limits how many are VIEWABLE in getLeads.
        const leadId = await ctx.db.insert("leads", {
            ownerId: args.ownerId,
            propertyId: args.propertyId,
            propertyName: sanitizedPropertyName,
            inquirerName: sanitizedName,
            inquirerContact: sanitizedContact,
            message: sanitizedMessage,
            status: "new",
            createdAt: Date.now(),
        });

        await ctx.db.insert("notifications", {
            userId: args.ownerId,
            type: "new_lead",
            read: false,
            title: "New Lead Inquiry",
            message: `${sanitizedName} has sent you a message!`,
            link: "/dashboard/leads",
            data: { leadId, inquirerName: sanitizedName },
            createdAt: Date.now(),
        });

        const user = await ctx.db.get(args.ownerId);
        if (user && user.email) {
            await ctx.scheduler.runAfter(0, internal.email.sendLeadNotification, {
                toEmail: user.email,
                inquirerName: sanitizedName,
                inquirerContact: sanitizedContact,
                propertyName: sanitizedPropertyName,
                message: sanitizedMessage,
            });
        }

        return leadId;
    },
});

export const getLeads = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) {
            return { leads: [], lockedCount: 0, leadViewCap: null as number | null, canExport: false };
        }
        let user;
        try {
            user = await requireUserMatching(ctx, args.clerkId);
        } catch (_error) {
            return { leads: [], lockedCount: 0, leadViewCap: null as number | null, canExport: false };
        }
        const { limits } = planContext(user);

        const allLeads = await ctx.db
            .query("leads")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .order("desc")
            .collect();

        // Free plan: only the newest `leadViewCap` leads are viewable; older
        // ones are captured but locked behind an upgrade.
        const cap = limits.leadViewCap;
        let leads = allLeads;
        let lockedCount = 0;
        if (cap !== null && allLeads.length > cap) {
            leads = allLeads.slice(0, cap);
            lockedCount = allLeads.length - cap;
        }

        return {
            leads,
            lockedCount,
            leadViewCap: cap,
            canExport: limits.canExportLeads,
        };
    },
});

export const markContacted = mutation({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.ownerId !== user._id) {
            throw new Error("Unauthorized: lead not found or not owned by caller");
        }
        await ctx.db.patch(args.leadId, {
            status: "contacted",
            lastContactedAt: Date.now(),
        });
    },
});
