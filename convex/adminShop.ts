import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";

/**
 * Admin Shop Management
 * 
 * Admin-only functions for managing products, categories, orders, and analytics.
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const categoryId = await ctx.db.insert("productCategories", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      parentId: args.parentId,
      image: args.image,
      isActive: true,
      sortOrder: args.sortOrder,
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
    await requireAdmin(ctx, args.clerkId);

    const { categoryId, clerkId, ...updates } = args;

    await ctx.db.patch(categoryId, updates);

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
    await requireAdmin(ctx, args.clerkId);

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
    categoryId: v.id("productCategories"),
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, ...productData } = args;

    const productId = await ctx.db.insert("products", productData);

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
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.union(v.literal("cm"), v.literal("in")),
    })),
    shippingRequired: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, productId, ...updates } = args;

    await ctx.db.patch(productId, updates);

    return { success: true };
  },
});

export const deleteProduct = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

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

    // Filter by category
    if (args.categoryId) {
      products = products.filter(p => p.categoryId === args.categoryId);
    }

    // Filter by search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (args.status === "published") {
      products = products.filter(p => p.isPublished);
    } else if (args.status === "draft") {
      products = products.filter(p => !p.isPublished);
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
    options: v.array(v.object({
      optionName: v.string(),
      optionValue: v.string(),
    })),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, ...variationData } = args;

    const variationId = await ctx.db.insert("productVariations", variationData);

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
    options: v.optional(v.array(v.object({
      optionName: v.string(),
      optionValue: v.string(),
    }))),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, variationId, ...updates } = args;

    await ctx.db.patch(variationId, updates);

    return { success: true };
  },
});

export const deleteVariation = mutation({
  args: {
    clerkId: v.string(),
    variationId: v.id("productVariations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    await ctx.db.delete(args.variationId);

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
// ORDER MANAGEMENT
// ==========================================

export const getOrders = query({
  args: {
    clerkId: v.string(),
    status: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    let orders = await ctx.db.query("orders").collect();

    // Filter by status
    if (args.status) {
      orders = orders.filter(o => o.status === args.status);
    }

    // Filter by payment status
    if (args.paymentStatus) {
      orders = orders.filter(o => o.paymentStatus === args.paymentStatus);
    }

    // Filter by date range
    if (args.dateFrom) {
      orders = orders.filter(o => o.createdAt >= args.dateFrom!);
    }
    if (args.dateTo) {
      orders = orders.filter(o => o.createdAt <= args.dateTo!);
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => b.createdAt - a.createdAt);

    return orders;
  },
});

export const getOrder = query({
  args: {
    clerkId: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const order = await ctx.db.get(args.orderId);
    return order;
  },
});

export const updateOrderStatus = mutation({
  args: {
    clerkId: v.string(),
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.notes) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.orderId, updates);

    return { success: true };
  },
});

// ==========================================
// INVENTORY & ANALYTICS
// ==========================================

export const getLowStockProducts = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const products = await ctx.db.query("products").collect();
    
    const lowStock = products.filter(p =>
      p.trackInventory && p.inventory <= p.lowStockThreshold
    );

    return lowStock;
  },
});

export const getSalesStats = query({
  args: {
    clerkId: v.string(),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    let orders = await ctx.db.query("orders").collect();

    // Filter paid orders only
    orders = orders.filter(o => o.paymentStatus === "paid");

    // Filter by date range
    if (args.dateFrom) {
      orders = orders.filter(o => o.createdAt >= args.dateFrom!);
    }
    if (args.dateTo) {
      orders = orders.filter(o => o.createdAt <= args.dateTo!);
    }

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top selling products
    const productSales: Record<string, { productId: string, productName: string, quantity: number, revenue: number }> = {};

    for (const order of orders) {
      for (const item of order.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts,
    };
  },
});

// ==========================================
// DISCOUNT MANAGEMENT
// ==========================================

export const createDiscount = mutation({
  args: {
    clerkId: v.string(),
    code: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    minOrderValue: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    validFrom: v.number(),
    validUntil: v.optional(v.number()),
    applicableProducts: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, ...discountData } = args;

    const discountId = await ctx.db.insert("discounts", {
      ...discountData,
      usedCount: 0,
      isActive: true,
    });

    return { success: true, discountId };
  },
});

export const updateDiscount = mutation({
  args: {
    clerkId: v.string(),
    discountId: v.id("discounts"),
    code: v.optional(v.string()),
    type: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    value: v.optional(v.number()),
    minOrderValue: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    applicableProducts: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const { clerkId, discountId, ...updates } = args;

    await ctx.db.patch(discountId, updates);

    return { success: true };
  },
});

export const deleteDiscount = mutation({
  args: {
    clerkId: v.string(),
    discountId: v.id("discounts"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    await ctx.db.delete(args.discountId);

    return { success: true };
  },
});

export const getDiscounts = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const discounts = await ctx.db.query("discounts").collect();
    return discounts;
  },
});
