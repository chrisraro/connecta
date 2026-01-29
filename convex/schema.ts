import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users (Agents & Brokers)
  users: defineTable({
    email: v.string(),
    clerkId: v.string(),
    role: v.union(v.literal("agent"), v.literal("admin")),
    subscriptionStatus: v.string(), // "active", "past_due"
    credits: v.number(), // Token balance for AI generation
  }).index("by_clerkId", ["clerkId"]),

  // 2. Physical Inventory (Cards)
  cards: defineTable({
    ownerId: v.id("users"),
    uuid: v.string(), // The unique ID burned into the NFC tag
    activationCode: v.string(), // Printed on card for verification
    status: v.union(v.literal("inventory"), v.literal("active"), v.literal("lost")),
    linkedProfileId: v.optional(v.id("profiles")),
    tapCount: v.number(),
  }).index("by_uuid", ["uuid"])
    .index("by_owner", ["ownerId"]),

  // 3. Digital Profiles (The Generative UI Data)
  profiles: defineTable({
    ownerId: v.id("users"),
    name: v.string(), // e.g., "Luxury Portfolio 2026"

    // Core Agent Data
    agentInfo: v.object({
      fullName: v.string(),
      title: v.string(), // e.g. "Senior Broker"
      company: v.string(),
      phone: v.string(),
      email: v.string(),
      website: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      socialLinks: v.array(v.object({ platform: v.string(), url: v.string() })),
    }),

    // The AI Configuration (JSON Recipe)
    layoutConfig: v.object({
      themeId: v.string(), // "gold-standard", "modern-minimal"
      colorPalette: v.object({ primary: v.string(), background: v.string(), text: v.string() }),
      componentOrder: v.array(v.string()), // ["Hero", "Properties", "LeadForm"]
      heroStyle: v.string(),
    }),

    // Linked Property Listings
    featuredProperties: v.array(v.id("properties")),
  }).index("by_owner", ["ownerId"]),

  // 4. Properties (Mini-CMS)
  properties: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    price: v.number(),
    status: v.union(v.literal("for-sale"), v.literal("for-rent"), v.literal("sold")),
    imageUrl: v.string(),
    detailsUrl: v.string(),
  }).index("by_owner", ["ownerId"]),

  // 5. Leads (Analytics)
  leads: defineTable({
    cardId: v.id("cards"),
    profileId: v.id("profiles"),
    visitorName: v.optional(v.string()),
    visitorPhone: v.optional(v.string()), // Captured via "Share Info" form
    capturedAt: v.number(),
  }),
});
