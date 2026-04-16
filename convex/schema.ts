import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users
  users: defineTable({
    email: v.string(),
    clerkId: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("agent"), v.literal("admin")),
    subscriptionStatus: v.string(),
    credits: v.number(),
    // Onboarding
    onboardingCompleted: v.optional(v.boolean()),
    onboardingData: v.optional(v.object({
      profileCategory: v.optional(v.union(v.literal("individual"), v.literal("company"), v.literal("business"))),
      email: v.optional(v.string()),
      fullName: v.string(),
      title: v.string(),
      company: v.optional(v.string()),
      phone: v.string(),
      website: v.optional(v.string()),
      about: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      services: v.array(v.string()),
      socialLinks: v.optional(v.array(v.object({ platform: v.string(), url: v.string() }))),
    })),
  }).index("by_clerkId", ["clerkId"]),

  // 2. Physical NFC Cards
  cards: defineTable({
    ownerId: v.id("users"),
    uuid: v.string(),
    activationCode: v.string(),
    status: v.union(v.literal("inventory"), v.literal("active"), v.literal("lost")),
    linkedProfileId: v.optional(v.id("profiles")),
    tapCount: v.number(),
  }).index("by_uuid", ["uuid"])
    .index("by_owner", ["ownerId"]),

  // 3. Digital Profiles
  profiles: defineTable({
    ownerId: v.id("users"),
    name: v.string(),

    agentInfo: v.object({
      fullName: v.string(),
      title: v.string(),
      company: v.string(),
      phone: v.string(),
      email: v.string(),
      address: v.optional(v.string()),
      website: v.optional(v.string()),
      about: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      socialLinks: v.array(v.object({ platform: v.string(), url: v.string() })),
      services: v.optional(v.array(v.string())),
    }),


    layoutConfig: v.object({
      themeId: v.string(),
      colorPalette: v.object({ primary: v.string(), background: v.string(), text: v.string() }),
      componentOrder: v.array(v.string()),
      heroStyle: v.string(),
    }),

    featuredProperties: v.array(v.id("properties")),
    featuredProjects: v.optional(v.array(v.string())), // project IDs (strings, not Convex IDs for local builder state)
  }).index("by_owner", ["ownerId"]),

  // 4. Real Estate Properties (kept for RE professionals)
  properties: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    status: v.union(v.literal("for-sale"), v.literal("for-rent"), v.literal("sold")),
    type: v.union(
      v.literal("lot-only"),
      v.literal("house-lot"),
      v.literal("townhouse"),
      v.literal("condo"),
      v.literal("commercial")
    ),
    images: v.array(v.string()),
    floorArea: v.optional(v.number()),
    lotArea: v.optional(v.number()),
    floors: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    location: v.optional(v.string()),
    detailsUrl: v.optional(v.string()),
    dateSold: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),

  // 5. Portfolio Projects (for creative/freelance/tech professionals)
  projects: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("graphic-design"),
      v.literal("web-design"),
      v.literal("photography"),
      v.literal("video"),
      v.literal("branding"),
      v.literal("case-study"),
      v.literal("development"),
      v.literal("ui-ux"),
      v.literal("real-estate"),
      v.literal("other")
    ),
    tags: v.array(v.string()),
    images: v.array(v.string()),
    externalUrl: v.optional(v.string()),
    caseStudyUrl: v.optional(v.string()),
    featured: v.boolean(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // 6. Leads & Inquiries
  leads: defineTable({
    ownerId: v.id("users"),
    propertyId: v.id("properties"),
    propertyName: v.string(),
    inquirerName: v.string(),
    inquirerContact: v.string(),
    message: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("closed")),
    lastContactedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),
});
