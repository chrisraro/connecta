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

// Task 17 / I2 — the cap was keyed ONLY on the profile owner
// (`lead:${ownerId}`), so every anonymous visitor to one profile shared a
// single 5/min bucket: SigmaTap's flagship scenario (NFC taps at a
// networking event) meant ten different prospects tapping the same card in
// a minute throttled half of them, none of whom had ever submitted before.
//
// Two-tier fix:
//  - VISITOR_MAX scopes the familiar 5/min cap to `visitorId`, a
//    client-generated id persisted in localStorage (see
//    lib/offline-leads.ts's getOrCreateLeadVisitorId) that's unique per
//    browser, not per owner. Distinct visitors no longer collide.
//  - visitorId is client-supplied, so a scripted attacker can trivially
//    rotate it per request — VISITOR_MAX alone is not real abuse
//    protection. OWNER_AGGREGATE_MAX is the backstop: it still bounds one
//    owner's total inbox rate even when every call brings a fresh visitor
//    id. 30/min is sized against the real scenario, not picked arbitrarily:
//    a legitimate submission requires a visitor to load the public profile
//    and hand-type name + contact (a few seconds minimum), so even a
//    red-hot booth with a constant line of people isn't going to sustain
//    much faster than one genuine submission every ~2 seconds — 30/min
//    covers that peak with real headroom while still bounding the cost and
//    spam blast radius of a token-rotating flood.
const VISITOR_MAX = 5;
const OWNER_AGGREGATE_MAX = 30;

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
        // Client-generated, localStorage-persisted per-browser id (not
        // authenticated — the submitter is always anonymous here). Optional
        // only so an old cached client bundle degrades to the pre-fix
        // shared-owner-bucket behavior instead of a hard validator error.
        visitorId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkRateLimit(ctx, `lead:${args.ownerId}:${args.visitorId ?? "anon"}`, {
            max: VISITOR_MAX,
            windowMs: 60_000,
        });
        await checkRateLimit(ctx, `lead:${args.ownerId}`, {
            max: OWNER_AGGREGATE_MAX,
            windowMs: 60_000,
        });
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
