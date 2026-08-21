import { v } from "convex/values";
import { mutation, query, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { requireUserMatching } from "./authz";
import { planContext } from "./billing";
import { slugify, isReservedSlug } from "../lib/slug";
import { Doc, Id } from "./_generated/dataModel";

/**
 * The string a profile's vanity slug is derived from.
 *
 * Deliberately the PERSON'S NAME, not `profile.name` — the builder sets
 * `profile.name` to "<fullName>'s Profile", which would yield the clumsy
 * `/christian-raros-profile` instead of `/christian-raro`. The slug is printed
 * on and shared alongside a premium card, so it reads as an identity, not a
 * record label.
 */
function slugSourceFor(profile: {
    name: string;
    agentInfo?: { fullName?: string };
}): string {
    const fullName = profile.agentInfo?.fullName?.trim();
    return fullName || profile.name;
}

/** Find a slug for `source` that isn't reserved and isn't already taken. */
async function assignUniqueSlug(
    ctx: MutationCtx,
    source: string,
    opts?: { excludeProfileId?: Id<"profiles"> }
): Promise<string> {
    const base = slugify(source);
    const candidates = [
        base,
        ...Array.from({ length: 12 }, (_, i) =>
            slugify(source, Math.random().toString(36).slice(2, 5) + i)
        ),
    ];
    for (const candidate of candidates) {
        if (isReservedSlug(candidate)) continue;
        const taken = await ctx.db
            .query("profiles")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
        // A profile never collides with its own current slug.
        if (!taken || taken._id === opts?.excludeProfileId) return candidate;
    }
    // Exhausted: fall back to something guaranteed free.
    return slugify(source, Date.now().toString(36));
}

/**
 * Shared enrichment applied to a raw profile document before it is exposed
 * to any public reader — by id or by slug. Kept in one place so the two
 * lookup paths (`getProfile`, `getProfileBySlug`) cannot drift.
 */
async function enrichProfile(ctx: QueryCtx, profile: Doc<"profiles">) {
    // Compute the owner's effective plan server-side and expose ONLY a
    // cosmetic boolean (showBranding) plus optional team branding — never
    // leak the owner's plan/expiry internals to the public.
    const owner = await ctx.db.get(profile.ownerId);
    let showBranding = true;
    let teamBranding: {
        companyName?: string;
        logoUrl?: string;
        accentColor?: string;
    } | null = null;

    if (owner) {
        const { plan, limits } = planContext(owner);
        showBranding = limits.showBranding;
        // Business members inherit shared team branding on their profile.
        if (plan === "business" && owner.teamId) {
            const team = await ctx.db.get(owner.teamId);
            if (team) {
                teamBranding = {
                    companyName: team.companyName,
                    logoUrl: team.logoUrl,
                    accentColor: team.accentColor,
                };
            }
        }
    }

    // Batch-resolve every Convex-storage-id image referenced by this
    // profile in one pass, instead of leaving each <ProfileImage> to fire
    // its own useQuery round-trip on the client (UI/UX audit P0 — this
    // was the single biggest contributor to slow first paint on the
    // public profile page).
    const candidateIds = [
        profile.agentInfo.avatarUrl,
        ...(profile.agentInfo.gallery ?? []),
    ].filter((id): id is string => {
        if (!id) return false;
        return !id.startsWith("http") && !id.startsWith("data:") && !id.startsWith("blob:");
    });
    const uniqueIds = Array.from(new Set(candidateIds));
    const resolvedEntries = await Promise.all(
        uniqueIds.map(async (id) => {
            try {
                const url = await ctx.storage.getUrl(id);
                return url ? ([id, url] as const) : null;
            } catch {
                return null;
            }
        })
    );
    const resolvedImages: Record<string, string> = {};
    for (const entry of resolvedEntries) {
        if (entry) resolvedImages[entry[0]] = entry[1];
    }

    return { ...profile, showBranding, teamBranding, resolvedImages };
}

/**
 * Every field a brand-new profile row needs, minus the parts only the
 * caller (owner id, gating) can supply. Deliberately typed off the schema
 * (`Doc<"profiles">`) rather than hand-duplicated, so this can never drift
 * from what `profiles` actually stores.
 */
export type NewProfileFields = {
    name: string;
    profileType?: Doc<"profiles">["profileType"];
    agentInfo: Doc<"profiles">["agentInfo"];
    layoutConfig: Doc<"profiles">["layoutConfig"];
    featuredProperties?: Doc<"profiles">["featuredProperties"];
    featuredProjects?: Doc<"profiles">["featuredProjects"];
    products?: Doc<"profiles">["products"];
    services?: Doc<"profiles">["services"];
    propertyListings?: Doc<"profiles">["propertyListings"];
    inlineProjects?: Doc<"profiles">["inlineProjects"];
    digitalCard?: Doc<"profiles">["digitalCard"];
    showStorefront?: Doc<"profiles">["showStorefront"];
};

/**
 * THE single write path for inserting a brand-new profile row.
 *
 * `createProfile`'s create branch (below) and `updateOnboarding`
 * (convex/users.ts, the "user finishes onboarding with zero profiles"
 * branch) both call this instead of running their own `ctx.db.insert`, so
 * a profile has the exact same shape — real slug via `assignUniqueSlug`,
 * every array field defaulted the same way — no matter which door created
 * it.
 *
 * Before Task 12, onboarding's completion step had its own parallel
 * `ctx.db.insert("profiles", …)` that silently diverged from this one: no
 * slug (public link stuck at `/p/<convexId>`), no `digitalCard`. Worse,
 * because that profile already counted against the free plan's
 * `maxProfiles: 1`, the very next thing the product did — send the user to
 * the builder in "Create Profile" mode with no `?id=` — made the user's
 * first Save fail every time with "Upgrade to Pro for unlimited profiles."
 * See `app/dashboard/onboarding/page.tsx`'s `handleFinish`, which now
 * routes to `/dashboard/builder?id=<the id returned here>` so the builder
 * edits this row instead of trying to create a second one.
 */
export async function insertNewProfile(
    ctx: MutationCtx,
    ownerId: Id<"users">,
    fields: NewProfileFields
): Promise<{ id: Id<"profiles">; slug: string }> {
    const slug = await assignUniqueSlug(ctx, slugSourceFor(fields));
    const profileId = await ctx.db.insert("profiles", {
        ownerId,
        name: fields.name,
        slug,
        profileType: fields.profileType,
        agentInfo: fields.agentInfo,
        layoutConfig: fields.layoutConfig,
        featuredProperties: fields.featuredProperties ?? [],
        featuredProjects: fields.featuredProjects ?? [],
        products: fields.products,
        services: fields.services,
        propertyListings: fields.propertyListings,
        inlineProjects: fields.inlineProjects,
        digitalCard: fields.digitalCard,
        showStorefront: fields.showStorefront,
    });
    return { id: profileId, slug };
}

export const createProfile = mutation({
    args: {
        name: v.string(), // e.g., "My Luxury Profile"
        profileType: v.optional(v.union(v.literal("individual"), v.literal("company"), v.literal("business"))),
        agentInfo: v.object({
            fullName: v.string(),
            title: v.string(),
            company: v.string(),
            phone: v.string(),
            email: v.string(),
            additionalPhones: v.optional(v.array(v.string())),
            additionalEmails: v.optional(v.array(v.string())),
            address: v.optional(v.string()),
            website: v.optional(v.string()),
            about: v.optional(v.string()),
            avatarUrl: v.optional(v.string()),
            services: v.optional(v.array(v.string())),
            socialLinks: v.array(v.object({ platform: v.string(), url: v.string() })),
            certification: v.optional(v.object({
                title: v.string(),
                description: v.string(),
            })),
            education: v.optional(v.array(v.object({
                degree: v.string(),
                school: v.string(),
                year: v.optional(v.string()),
            }))),
            techStack: v.optional(v.array(v.object({
                category: v.string(),
                skills: v.array(v.string()),
            }))),
            experience: v.optional(v.array(v.object({
                title: v.string(),
                company: v.string(),
                period: v.string(),
                description: v.optional(v.string()),
            }))),
            testimonials: v.optional(v.array(v.object({
                quote: v.string(),
                author: v.string(),
                role: v.optional(v.string()),
            }))),
            gallery: v.optional(v.array(v.string())),
        }),
        layoutConfig: v.object({
            themeId: v.string(),
            colorPalette: v.object({
                primary: v.string(),
                background: v.string(),
                text: v.string(),
                secondary: v.optional(v.string()),
                accent: v.optional(v.string()),
            }),
            componentOrder: v.array(v.string()),
            heroStyle: v.string(),
        }),
        featuredProperties: v.array(v.id("properties")),
        featuredProjects: v.optional(v.array(v.string())),
        products: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            price: v.optional(v.number()),
            image: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        services: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            price: v.optional(v.number()),
            image: v.optional(v.string()),
        }))),
        propertyListings: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            price: v.optional(v.string()),
            location: v.optional(v.string()),
            image: v.optional(v.string()),
            status: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        inlineProjects: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            category: v.optional(v.string()),
            image: v.optional(v.string()),
            link: v.optional(v.string()),
        }))),
        digitalCard: v.optional(v.object({
            backgroundColor: v.string(),
            textColor: v.string(),
            layout: v.union(v.literal("classic"), v.literal("split"), v.literal("centered")),
            showQrCode: v.boolean(),
            theme: v.union(v.literal("light"), v.literal("dark"), v.literal("glass"), v.literal("carbon")),
            cardBackgroundType: v.union(v.literal("solid"), v.literal("gradient")),
            cardGradientStart: v.optional(v.string()),
            cardGradientEnd: v.optional(v.string()),
            positions: v.optional(v.object({
                header: v.optional(v.object({ x: v.number(), y: v.number(), width: v.optional(v.number()), scale: v.optional(v.number()) })),
                qr: v.optional(v.object({ x: v.number(), y: v.number(), width: v.optional(v.number()), scale: v.optional(v.number()) })),
                bio: v.optional(v.object({ x: v.number(), y: v.number(), width: v.optional(v.number()), scale: v.optional(v.number()) })),
                contacts: v.optional(v.object({ x: v.number(), y: v.number(), width: v.optional(v.number()), scale: v.optional(v.number()) })),
            })),
        })),
        showStorefront: v.optional(v.boolean()),
        clerkId: v.string(),
        id: v.optional(v.id("profiles")),
    },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const { limits } = planContext(user);

        // Template gating: free plan may only select the basic templates.
        if (
            limits.allowedTemplateIds !== null &&
            !limits.allowedTemplateIds.includes(args.layoutConfig.themeId)
        ) {
            throw new Error(
                "This template is available on Pro & Business. Upgrade to unlock all templates."
            );
        }

        // Profile-count gating: enforce only when creating a NEW profile.
        if (!args.id && limits.maxProfiles !== null) {
            const existing = await ctx.db
                .query("profiles")
                .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
                .collect();
            if (existing.length >= limits.maxProfiles) {
                throw new Error("Upgrade to Pro for unlimited profiles.");
            }
        }

        const profileData = {
            ownerId: user._id,
            name: args.name,
            profileType: args.profileType,
            agentInfo: args.agentInfo,
            layoutConfig: args.layoutConfig,
            featuredProperties: args.featuredProperties,
            featuredProjects: args.featuredProjects || [],
            products: args.products,
            services: args.services,
            propertyListings: args.propertyListings,
            inlineProjects: args.inlineProjects,
            digitalCard: args.digitalCard,
            showStorefront: args.showStorefront,
        };

        if (args.id) {
            const existing = await ctx.db.get(args.id);
            if (!existing || existing.ownerId !== user._id) {
                throw new Error("Unauthorized or profile not found");
            }
            // Slug is assigned once and never touched again once it exists —
            // a published /<slug> URL must never change underneath a card
            // that's already printed. But a LOT of profiles predate the slug
            // feature entirely (it only ever assigned one in the INSERT
            // branch above), so any legacy row still missing one gets it
            // assigned here, the first time it's touched again.
            const slug =
                existing.slug ??
                (await assignUniqueSlug(ctx, slugSourceFor(args), {
                    excludeProfileId: args.id,
                }));
            await ctx.db.patch(args.id, { ...profileData, slug });
            return { id: args.id, slug };
        }

        return await insertNewProfile(ctx, user._id, profileData);
    },
});

/**
 * One-time (idempotent) backfill for profiles created before the slug
 * feature existed, or otherwise still missing one. Safe to re-run: any
 * profile that already has a slug is left untouched, so a second run is a
 * no-op.
 *
 * Paginated rather than a single `.collect()`, because this runs once
 * against a production table of unknown size and an unbounded scan would
 * blow Convex's per-mutation read limit. Call repeatedly, passing the
 * returned `cursor` back in, until `isDone` is true:
 *   npx convex run profiles:internalBackfillSlugs '{}'
 *   npx convex run profiles:internalBackfillSlugs '{"cursor":"<cursor>"}'
 */
export const internalBackfillSlugs = internalMutation({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
        batchSize: v.optional(v.number()),
        /**
         * Re-derive slugs that ALREADY exist, when the current slug doesn't
         * match what today's derivation would produce.
         *
         * Off by default and must be passed explicitly, because this CHANGES
         * LIVE URLS — any link already shared by a user breaks. Only safe
         * before launch. Physical NFC cards are unaffected either way: they
         * encode /t/<card-uuid>, never the profile slug.
         */
        reslugExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const numItems = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
        const page = await ctx.db
            .query("profiles")
            .paginate({ cursor: args.cursor ?? null, numItems });

        let backfilled = 0;
        let reslugged = 0;
        const changes: Array<{ from: string; to: string }> = [];

        for (const profile of page.page) {
            const source = slugSourceFor(profile);

            if (!profile.slug) {
                const slug = await assignUniqueSlug(ctx, source, {
                    excludeProfileId: profile._id,
                });
                await ctx.db.patch(profile._id, { slug });
                backfilled++;
                continue;
            }

            if (!args.reslugExisting) continue;

            // Only rewrite when the existing slug isn't already the ideal one
            // (ignoring any uniqueness suffix this profile legitimately needs).
            const ideal = slugify(source);
            if (profile.slug === ideal || profile.slug.startsWith(`${ideal}-`)) continue;

            const slug = await assignUniqueSlug(ctx, source, {
                excludeProfileId: profile._id,
            });
            if (slug === profile.slug) continue;
            changes.push({ from: profile.slug, to: slug });
            await ctx.db.patch(profile._id, { slug });
            reslugged++;
        }

        return {
            scanned: page.page.length,
            backfilled,
            reslugged,
            changes,
            isDone: page.isDone,
            cursor: page.isDone ? null : page.continueCursor,
        };
    },
});

export const deleteProfile = mutation({
    args: { profileId: v.id("profiles"), clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await requireUserMatching(ctx, args.clerkId);

        const profile = await ctx.db.get(args.profileId);
        if (!profile || profile.ownerId !== user._id) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.profileId);
    },
});

export const getProfile = query({
    args: { profileId: v.id("profiles") },
    handler: async (ctx, args) => {
        const profile = await ctx.db.get(args.profileId);
        if (!profile) return null;
        return await enrichProfile(ctx, profile);
    },
});

// Vanity-URL lookup (/<slug>) — resolves through the same enrichment as
// getProfile so the two public entry points can never drift apart.
export const getProfileBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        if (!profile) return null;
        return await enrichProfile(ctx, profile);
    },
});

// Helper to get all profiles for the dashboard
export const getMyProfiles = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        // Only the authenticated owner can list their own profiles.
        const user = await requireUserMatching(ctx, args.clerkId);

        return await ctx.db
            .query("profiles")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});
