import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserMatching } from "./authz";
import { planContext } from "./billing";

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
        };

        if (args.id) {
            const existing = await ctx.db.get(args.id);
            if (!existing || existing.ownerId !== user._id) {
                throw new Error("Unauthorized or profile not found");
            }
            await ctx.db.patch(args.id, profileData);
            return args.id;
        }

        const profileId = await ctx.db.insert("profiles", profileData);
        return profileId;
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
