import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";
import { logAudit } from "./audit";

/**
 * Admin Shop Management
 *
 * Admin-only functions for managing the product catalog: categories,
 * products, variations, and inventory. There are no orders or discounts —
 * the shop routes purchases to an inquiry rather than a checkout.
 */

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

export const createCategory = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("productCategories")),
    image: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const categoryId = await ctx.db.insert("productCategories", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      parentId: args.parentId,
      image: args.image,
      isActive: args.isActive !== undefined ? args.isActive : true,
      sortOrder: args.sortOrder,
    });

    await logAudit(ctx, {
      userId: admin._id,
      action: "create",
      resourceType: "productCategory",
      resourceId: categoryId,
      changes: { name: args.name, slug: args.slug },
    });

    return { success: true, categoryId };
  },
});

export const updateCategory = mutation({
  args: {
    clerkId: v.string(),
    categoryId: v.id("productCategories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("productCategories")),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const { categoryId, clerkId: _clerkId, ...updates } = args;

    await ctx.db.patch(categoryId, updates);

    await logAudit(ctx, {
      userId: admin._id,
      action: "update",
      resourceType: "productCategory",
      resourceId: categoryId,
      changes: updates,
    });

    return { success: true };
  },
});

export const deleteCategory = mutation({
  args: {
    clerkId: v.string(),
    categoryId: v.id("productCategories"),
    reassignToId: v.optional(v.id("productCategories")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    // If reassigning products, update them
    if (args.reassignToId) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
        .collect();

      for (const product of products) {
        await ctx.db.patch(product._id, {
          categoryId: args.reassignToId!,
        });
      }
    }

    await ctx.db.delete(args.categoryId);

    await logAudit(ctx, {
      userId: admin._id,
      action: "delete",
      resourceType: "productCategory",
      resourceId: args.categoryId,
      changes: args.reassignToId ? { reassignedTo: args.reassignToId } : undefined,
    });

    return { success: true };
  },
});

export const getCategories = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const categories = await ctx.db.query("productCategories").collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// ==========================================
// PRODUCT MANAGEMENT
// ==========================================

export const createProduct = mutation({
  args: {
    clerkId: v.string(),
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
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.union(v.literal("cm"), v.literal("in")),
      }),
    ),
    shippingRequired: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const { clerkId: _clerkId, ...productData } = args;

    const productId = await ctx.db.insert("products", productData);

    await logAudit(ctx, {
      userId: admin._id,
      action: "create",
      resourceType: "product",
      resourceId: productId,
      changes: { name: args.name, sku: args.sku, basePrice: args.basePrice },
    });

    return { success: true, productId };
  },
});

export const updateProduct = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    basePrice: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    inventory: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    trackInventory: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    primaryImageIndex: v.optional(v.number()),
    weight: v.optional(v.number()),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.union(v.literal("cm"), v.literal("in")),
      }),
    ),
    shippingRequired: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const { clerkId: _clerkId, productId, ...updates } = args;

    await ctx.db.patch(productId, updates);

    await logAudit(ctx, {
      userId: admin._id,
      action: "update",
      resourceType: "product",
      resourceId: productId,
      changes: updates,
    });

    return { success: true };
  },
});

export const deleteProduct = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    // Delete associated variations
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    for (const variation of variations) {
      await ctx.db.delete(variation._id);
    }

    // Delete product
    await ctx.db.delete(args.productId);

    await logAudit(ctx, {
      userId: admin._id,
      action: "delete",
      resourceType: "product",
      resourceId: args.productId,
      changes: { deletedVariations: variations.length },
    });

    return { success: true };
  },
});

export const getProducts = query({
  args: {
    clerkId: v.string(),
    categoryId: v.optional(v.id("productCategories")),
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal("published"), v.literal("draft"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    let products = await ctx.db.query("products").collect();

    if (args.categoryId) {
      products = products.filter((p) => p.categoryId === args.categoryId);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower),
      );
    }

    if (args.status === "published") {
      products = products.filter((p) => p.isPublished);
    } else if (args.status === "draft") {
      products = products.filter((p) => !p.isPublished);
    }

    return products;
  },
});

export const getProduct = query({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const product = await ctx.db.get(args.productId);
    return product;
  },
});

// ==========================================
// VARIATION MANAGEMENT
// ==========================================

export const createVariation = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    name: v.string(),
    sku: v.string(),
    price: v.number(),
    inventory: v.number(),
    options: v.array(
      v.object({
        optionName: v.string(),
        optionValue: v.string(),
      }),
    ),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const { clerkId: _clerkId, ...variationData } = args;

    const variationId = await ctx.db.insert("productVariations", variationData);

    await logAudit(ctx, {
      userId: admin._id,
      action: "create",
      resourceType: "productVariation",
      resourceId: variationId,
      changes: { productId: args.productId, name: args.name, sku: args.sku },
    });

    return { success: true, variationId };
  },
});

export const updateVariation = mutation({
  args: {
    clerkId: v.string(),
    variationId: v.id("productVariations"),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    price: v.optional(v.number()),
    inventory: v.optional(v.number()),
    options: v.optional(
      v.array(
        v.object({
          optionName: v.string(),
          optionValue: v.string(),
        }),
      ),
    ),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    const { clerkId: _clerkId, variationId, ...updates } = args;

    await ctx.db.patch(variationId, updates);

    await logAudit(ctx, {
      userId: admin._id,
      action: "update",
      resourceType: "productVariation",
      resourceId: variationId,
      changes: updates,
    });

    return { success: true };
  },
});

export const deleteVariation = mutation({
  args: {
    clerkId: v.string(),
    variationId: v.id("productVariations"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId);

    await ctx.db.delete(args.variationId);

    await logAudit(ctx, {
      userId: admin._id,
      action: "delete",
      resourceType: "productVariation",
      resourceId: args.variationId,
    });

    return { success: true };
  },
});

export const getProductVariations = query({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return variations;
  },
});

// ==========================================
// INVENTORY
// ==========================================

export const getLowStockProducts = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const products = await ctx.db.query("products").collect();

    const lowStock = products.filter((p) => p.trackInventory && p.inventory <= p.lowStockThreshold);

    return lowStock;
  },
});
