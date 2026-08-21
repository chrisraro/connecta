import { v, ConvexError } from "convex/values";
import { mutation, query, action, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireUserMatching } from "./authz";
import { planContext } from "./billing";
import { checkRateLimit } from "./rateLimit";

async function getUser(ctx: QueryCtx, clerkId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
}

// Throws if activating one more card would exceed the user's plan limit on
// active cards. Free = 1 active card; paid plans = unlimited.
async function assertCanActivateCard(ctx: MutationCtx, user: Doc<"users">) {
    const { limits } = planContext(user);
    if (limits.maxActiveCards === null) return;
    const owned = await ctx.db
        .query("cards")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
    const activeCount = owned.filter((c) => c.status === "active").length;
    if (activeCount >= limits.maxActiveCards) {
        // ConvexError so the message survives production's redaction of
        // plain Error text (see lib/errors.ts#toUserMessage) and the
        // billing UI's "Get Pro" CTA can key off data.code === "PLAN_LIMIT"
        // (see lib/plans.ts#isPlanLimitError) instead of message-sniffing.
        throw new ConvexError({
            code: "PLAN_LIMIT",
            message: "Upgrade to Pro to activate more than one card.",
        });
    }
}

// Internal: check-and-record one activation attempt for the authenticated
// user, keyed by their trusted Convex user id (not the client-supplied
// clerkId string, so it can't be bypassed by resubmitting the args).
//
// This has to be its own mutation, separate from `performActivateCard`,
// because Convex mutations are atomic: if `performActivateCard` later
// throws (wrong code), only ITS OWN writes roll back. This call already
// committed moments earlier — invoked via `ctx.runMutation` from the
// `activateCard` action below, which is not itself one atomic transaction —
// so repeated wrong-code guesses genuinely accumulate toward the limit
// instead of being silently wiped out by the throw. (A plain mutation that
// called checkRateLimit and then threw for a bad code would roll its own
// rate-limit write back along with everything else, so the counter would
// never advance past 1 no matter how many times an attacker retried.)
export const recordActivationAttempt = internalMutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);
        await checkRateLimit(ctx, `activate:${user._id}`, { max: 5, windowMs: 60_000 });
    },
});

// Internal: the actual activation logic, unchanged from before other than
// living in its own mutation. Called from the `activateCard` action after
// the rate-limit gate above passes.
export const performActivateCard = internalMutation({
    args: {
        clerkId: v.string(),
        activationCode: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        // Codes are stored uppercase (generated from an uppercase alphabet),
        // and users transcribe them by hand — normalize before the
        // exact-match index lookup. The raw-input fallback covers legacy
        // codes from the old client-side generator, which contain lowercase
        // hex segments and would be destroyed by uppercasing.
        const normalized = args.activationCode.trim().toUpperCase();
        let card = await ctx.db
            .query("cards")
            .withIndex("by_activationCode", (q) => q.eq("activationCode", normalized))
            .first();
        if (!card) {
            card = await ctx.db
                .query("cards")
                .withIndex("by_activationCode", (q) => q.eq("activationCode", args.activationCode.trim()))
                .first();
        }

        if (!card) throw new Error("Invalid activation code");
        if (card.status !== "inventory") throw new Error("Card already activated or reported lost");

        await assertCanActivateCard(ctx, user);

        await ctx.db.patch(card._id, {
            ownerId: user._id,
            status: "active",
        });

        return card._id;
    },
});

// Public entry point. An action rather than a mutation: see
// `recordActivationAttempt` for why the rate-limit bookkeeping needs to
// commit in its own transaction before the throw-prone validation step
// runs. Client callers use `useAction`, not `useMutation` — the calling
// convention (a function that resolves on success, rejects on error) is
// otherwise identical.
export const activateCard = action({
    args: {
        clerkId: v.string(),
        activationCode: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"cards">> => {
        await ctx.runMutation(internal.cards.recordActivationAttempt, { clerkId: args.clerkId });
        return await ctx.runMutation(internal.cards.performActivateCard, args);
    },
});

export const linkProfile = mutation({
    args: {
        clerkId: v.string(),
        cardId: v.id("cards"),
        profileId: v.optional(v.id("profiles")),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const card = await ctx.db.get(args.cardId);
        if (!card) throw new Error("Card not found");
        if (card.ownerId !== user._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.cardId, {
            linkedProfileId: args.profileId,
        });
    },
});

// Public, unauthenticated lookup — anyone who scans a card's QR (or
// enumerates /t/<uuid>) can call this before signing in. Return only the
// minimal projection the /t/[uuid] redirect page needs: never
// `activationCode` (the manual-claim secret) or `ownerId` (custodial admin
// id from factory registration, nobody's business either).
export const getCardByUuid = query({
    args: { uuid: v.string() },
    handler: async (ctx, args) => {
        const normalized = decodeURIComponent(args.uuid).trim().toLowerCase();
        const card = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", normalized))
            .first();
        if (!card) return null;
        return {
            _id: card._id,
            uuid: card.uuid,
            status: card.status,
            linkedProfileId: card.linkedProfileId,
        };
    },
});

export const incrementTapCount = mutation({
    args: { cardId: v.id("cards") },
    handler: async (ctx, args) => {
        await checkRateLimit(ctx, `tap:${args.cardId}`, { max: 20, windowMs: 60_000 });
        const card = await ctx.db.get(args.cardId);
        if (card) {
            await ctx.db.patch(args.cardId, {
                tapCount: card.tapCount + 1,
            });
        }
    },
});

// Internal: check-and-record one claim attempt for the authenticated
// identity, keyed the same way `claimCardByUuid` itself validates identity
// (verified subject, available before any user record exists — claiming can
// be the very first thing a brand-new signup does). See
// `recordActivationAttempt` above for why this must be a separate mutation
// from `performClaimCardByUuid` rather than a checkRateLimit call inlined at
// the top of one throwing mutation: this call's write commits independently
// the moment it returns, so it survives a later "card not found" throw in
// the same client-facing call instead of being rolled back with it.
export const recordClaimAttempt = internalMutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized: authentication required");
        if (identity.subject !== args.clerkId) throw new Error("Unauthorized: identity mismatch");
        await checkRateLimit(ctx, `claim:${identity.subject}`, { max: 5, windowMs: 60_000 });
    },
});

// Internal: the actual claim logic, unchanged from before other than living
// in its own mutation. Called from the `claimCardByUuid` action after the
// rate-limit gate above passes.
export const performClaimCardByUuid = internalMutation({
    args: {
        clerkId: v.string(),
        uuid: v.string(),
    },
    handler: async (ctx, args) => {
        // SECURITY: enforce that the claimed clerkId belongs to the authenticated
        // caller before creating/claiming anything in their name.
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized: authentication required");
        if (identity.subject !== args.clerkId) throw new Error("Unauthorized: identity mismatch");

        // Get or create user
        let user = await getUser(ctx, args.clerkId);

        if (!user) {
            // User doesn't exist in Convex yet - create them.
            // This happens when user just signed up via Clerk.
            const newUserId = await ctx.db.insert("users", {
                clerkId: args.clerkId,
                email: "", // Will be updated during onboarding
                role: "agent",
                subscriptionStatus: "active",
                plan: "free",
                onboardingCompleted: false,
            });

            user = await ctx.db.get(newUserId);
            if (!user) {
                throw new Error("Failed to create user");
            }
        }

        const normalizedUuid = decodeURIComponent(args.uuid).trim().toLowerCase();
        const card = await ctx.db
            .query("cards")
            .withIndex("by_uuid", (q) => q.eq("uuid", normalizedUuid))
            .first();

        if (!card) {
            throw new Error("Card not found");
        }

        // If card already belongs to this user and is active, return it (idempotent)
        if (card.ownerId === user._id && card.status === "active") {
            return card._id;
        }

        // `status` is the source of truth for claimability, NOT ownerId.
        // Factory registration stamps ownerId with the registering admin as
        // a custodian (the schema requires an owner), so an ownerId check
        // here rejected every card the factory ever produced — the QR
        // activation path was broken for all real stock. A card that is
        // still "inventory" is unowned in the product sense, whoever's id
        // it carries; a card that is NOT inventory belongs to whoever
        // activated it and must not be re-claimable.
        if (card.status !== "inventory") {
            throw new Error("Card is not available for claiming");
        }

        // Plan gating: free plan may only have one active card.
        await assertCanActivateCard(ctx, user);

        // Claim the card: assign ownership and activate
        await ctx.db.patch(card._id, {
            ownerId: user._id,
            status: "active",
        });

        return card._id;
    },
});

// Public entry point. An action rather than a mutation — see
// `recordClaimAttempt` above for why. Client callers use `useAction`, not
// `useMutation`; the calling convention (resolves on success, rejects on
// error) is otherwise identical.
export const claimCardByUuid = action({
    args: {
        clerkId: v.string(),
        uuid: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"cards">> => {
        await ctx.runMutation(internal.cards.recordClaimAttempt, { clerkId: args.clerkId });
        return await ctx.runMutation(internal.cards.performClaimCardByUuid, args);
    },
});

export const unclaimCard = mutation({
    args: {
        clerkId: v.string(),
        cardId: v.id("cards"),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const card = await ctx.db.get(args.cardId);
        if (!card) throw new Error("Card not found");
        if (card.ownerId !== user._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.cardId, {
            status: "inventory",
            linkedProfileId: undefined,
            tapCount: 0,
        });

        return { success: true };
    },
});

