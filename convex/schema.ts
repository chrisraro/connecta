import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    clerkId: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("agent"), v.literal("admin")),
    subscriptionStatus: v.string(),
    credits: v.number(),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("business"))),
    planExpiresAt: v.optional(v.number()),
    teamId: v.optional(v.id("teams")),
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

  cards: defineTable({
    ownerId: v.id("users"),
    uuid: v.string(),
    activationCode: v.string(),
    status: v.union(v.literal("inventory"), v.literal("active"), v.literal("lost")),
    linkedProfileId: v.optional(v.id("profiles")),
    tapCount: v.number(),
  }).index("by_uuid", ["uuid"])
    .index("by_owner", ["ownerId"])
    .index("by_activationCode", ["activationCode"]),

  profiles: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    profileType: v.optional(v.union(v.literal("individual"), v.literal("company"), v.literal("business"))),
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
  }).index("by_owner", ["ownerId"]),

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

  leads: defineTable({
    ownerId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    propertyName: v.optional(v.string()),
    inquirerName: v.string(),
    inquirerContact: v.string(),
    message: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("closed")),
    lastContactedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("new_lead"), v.literal("system")),
    read: v.boolean(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    data: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_read", ["userId", "read"]),

  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    changes: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_timestamp", ["timestamp"]),

  admins: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("moderator")),
    grantedBy: v.id("users"),
    grantedAt: v.number(),
    revokedAt: v.optional(v.number()),
    reason: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_active", ["revokedAt"]),

  productCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("productCategories")),
    image: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }).index("by_slug", ["slug"])
    .index("by_active", ["isActive"])
    .index("by_parent", ["parentId"]),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    basePrice: v.number(),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    sku: v.string(),
    barcode: v.optional(v.string()),
    inventory: v.number(),
    lowStockThreshold: v.number(),
    trackInventory: v.boolean(),
    isPublished: v.boolean(),
    isFeatured: v.boolean(),
    tags: v.array(v.string()),
    images: v.array(v.string()),
    primaryImageIndex: v.number(),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.union(v.literal("cm"), v.literal("in")),
    })),
    shippingRequired: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_published", ["isPublished"])
    .index("by_sku", ["sku"]),

  productVariations: defineTable({
    productId: v.id("products"),
    name: v.string(),
    sku: v.string(),
    price: v.number(),
    inventory: v.number(),
    options: v.array(v.object({
      optionName: v.string(),
      optionValue: v.string(),
    })),
    image: v.optional(v.string()),
  }).index("by_product", ["productId"])
    .index("by_sku", ["sku"]),

  carts: defineTable({
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    items: v.array(v.object({
      productId: v.id("products"),
      variationId: v.optional(v.id("productVariations")),
      quantity: v.number(),
      priceAtAdd: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_guest", ["guestId"]),

  orders: defineTable({
    orderNumber: v.string(),
    userId: v.optional(v.id("users")),
    guestEmail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    items: v.array(v.object({
      productId: v.id("products"),
      productName: v.string(),
      variationId: v.optional(v.id("productVariations")),
      variationName: v.optional(v.string()),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    shipping: v.number(),
    discount: v.optional(v.number()),
    appliedDiscountCode: v.optional(v.string()),
    total: v.number(),
    currency: v.string(),
    paymentProvider: v.union(v.literal("payrex"), v.literal("stripe"), v.literal("paypal")),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"), v.literal("refunded")),
    paymentIntentId: v.optional(v.string()),
    payrexCheckoutId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    shippingAddress: v.object({
      fullName: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
    billingAddress: v.optional(v.object({
      fullName: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_orderNumber", ["orderNumber"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_paymentStatus", ["paymentStatus"])
    .index("by_createdAt", ["createdAt"]),

  discounts: defineTable({
    code: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    minOrderValue: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    usedCount: v.number(),
    validFrom: v.number(),
    validUntil: v.optional(v.number()),
    isActive: v.boolean(),
    applicableProducts: v.optional(v.array(v.id("products"))),
  }).index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  // --- SaaS layer (Phase 4): teams, invites, subscription invoices ---

  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    seats: v.number(),
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    companyName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  teamInvites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
    createdAt: v.number(),
  }).index("by_team", ["teamId"])
    .index("by_email", ["email"]),

  subscriptionInvoices: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("business")),
    amountCentavos: v.number(),
    periodDays: v.number(),
    payrexCheckoutId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("expired")
    ),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_checkoutId", ["payrexCheckoutId"])
    .index("by_status", ["status"]),
});
