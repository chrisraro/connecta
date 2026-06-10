import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Public Shop Queries & Mutations
 * 
 * Handles product browsing, cart management, and guest checkout flow.
 */

// ==========================================
// CATEGORY QUERIES
// ==========================================

// Get all active categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();

    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// ==========================================
// PRODUCT QUERIES
// ==========================================

// Get published products with optional filters
export const getProducts = query({
  args: {
    categoryId: v.optional(v.id("productCategories")),
    search: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    inStockOnly: v.optional(v.boolean()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal("newest"),
      v.literal("price_asc"),
      v.literal("price_desc"),
      v.literal("popular")
    )),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Filter by category
    if (args.categoryId) {
      products = products.filter(p => p.categoryId === args.categoryId);
    }

    // Filter by featured
    if (args.featured) {
      products = products.filter(p => p.isFeatured);
    }

    // Filter by search (name, description, tags)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by stock
    if (args.inStockOnly) {
      products = products.filter(p => !p.trackInventory || p.inventory > 0);
    }

    // Filter by price range
    if (args.minPrice !== undefined) {
      products = products.filter(p => p.basePrice >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      products = products.filter(p => p.basePrice <= args.maxPrice!);
    }

    // Sort
    switch (args.sortBy) {
      case "price_asc":
        products.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case "price_desc":
        products.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case "popular":
        // For now, sort by creation time (newest first)
        products.sort((a, b) => b._creationTime - a._creationTime);
        break;
      case "newest":
      default:
        products.sort((a, b) => b._creationTime - a._creationTime);
        break;
    }

    return products;
  },
});

// Get single product by slug with variations
export const getProduct = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!product || !product.isPublished) {
      return null;
    }

    // Get variations
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();

    return {
      ...product,
      variations,
    };
  },
});

// Get product by ID
export const getProductById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    
    if (!product || !product.isPublished) {
      return null;
    }

    return product;
  },
});

// ==========================================
// CART OPERATIONS
// ==========================================

// Get cart by user ID or guest ID
export const getCart = query({
  args: {
    clerkId: v.optional(v.string()),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cart;

    // If clerkId provided, look up the user
    let userId;
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .first();
      userId = user?._id;
    }

    if (userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    if (!cart) {
      return null;
    }

    // Enrich cart items with product details
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        let variation = null;
        
        if (item.variationId) {
          variation = await ctx.db.get(item.variationId);
        }

        return {
          ...item,
          product,
          variation,
          lineTotal: item.priceAtAdd * item.quantity,
        };
      })
    );

    return {
      ...cart,
      items: enrichedItems,
      subtotal: enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0),
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  },
});

// Add item to cart
export const addToCart = mutation({
  args: {
    clerkId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    productId: v.id("products"),
    variationId: v.optional(v.id("productVariations")),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Lookup user from clerkId
    let userId;
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .first();
      userId = user?._id;
    }

    // Validate product exists and is published
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isPublished) {
      throw new Error("Product not available");
    }

    // Validate stock
    if (product.trackInventory && product.inventory < args.quantity) {
      throw new Error("Insufficient stock");
    }

    // If variation specified, validate it
    let price = product.basePrice;
    if (args.variationId) {
      const variation = await ctx.db.get(args.variationId);
      if (!variation || variation.productId !== args.productId) {
        throw new Error("Invalid variation");
      }
      price = variation.price;
      
      if (variation.inventory < args.quantity) {
        throw new Error("Insufficient stock for this variation");
      }
    }

    // Find or create cart
    let cart;
    if (userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    const now = Date.now();

    if (!cart) {
      // Create new cart
      const cartId = await ctx.db.insert("carts", {
        userId,
        guestId: args.guestId,
        items: [{
          productId: args.productId,
          variationId: args.variationId,
          quantity: args.quantity,
          priceAtAdd: price,
        }],
        createdAt: now,
        updatedAt: now,
      });

      return { cartId, success: true };
    }

    // Update existing cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === args.productId && item.variationId === args.variationId
    );

    let updatedItems = [...cart.items];

    if (existingItemIndex >= 0) {
      // Update quantity
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + args.quantity,
      };
    } else {
      // Add new item
      updatedItems.push({
        productId: args.productId,
        variationId: args.variationId,
        quantity: args.quantity,
        priceAtAdd: price,
      });
    }

    await ctx.db.patch(cart._id, {
      items: updatedItems,
      updatedAt: now,
    });

    return { cartId: cart._id, success: true };
  },
});

// Update cart item quantity
export const updateCartItem = mutation({
  args: {
    clerkId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    productId: v.id("products"),
    variationId: v.optional(v.id("productVariations")),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Lookup user from clerkId
    let userId;
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .first();
      userId = user?._id;
    }

    if (args.quantity < 0) {
      throw new Error("Quantity must be non-negative");
    }

    // Find cart
    let cart;
    if (userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    if (!cart) {
      throw new Error("Cart not found");
    }

    // Find and update item
    const itemIndex = cart.items.findIndex(
      item => item.productId === args.productId && item.variationId === args.variationId
    );

    if (itemIndex === -1) {
      throw new Error("Item not in cart");
    }

    let updatedItems = [...cart.items];

    if (args.quantity === 0) {
      // Remove item
      updatedItems.splice(itemIndex, 1);
    } else {
      // Update quantity
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: args.quantity,
      };
    }

    await ctx.db.patch(cart._id, {
      items: updatedItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove item from cart
export const removeFromCart = mutation({
  args: {
    clerkId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    productId: v.id("products"),
    variationId: v.optional(v.id("productVariations")),
  },
  handler: async (ctx, args) => {
    // Lookup user from clerkId
    let userId;
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .first();
      userId = user?._id;
    }

    // Find cart
    let cart;
    if (userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    if (!cart) {
      return { success: true };
    }

    // Remove item
    const updatedItems = cart.items.filter(
      item => !(item.productId === args.productId && item.variationId === args.variationId)
    );

    await ctx.db.patch(cart._id, {
      items: updatedItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Clear cart
export const clearCart = mutation({
  args: {
    clerkId: v.optional(v.string()),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Lookup user from clerkId
    let userId;
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .first();
      userId = user?._id;
    }

    let cart;
    if (userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    if (!cart) {
      return { success: true };
    }

    await ctx.db.patch(cart._id, {
      items: [],
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Merge guest cart into user cart (on login)
export const mergeGuestCart = mutation({
  args: {
    clerkId: v.string(),
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    // Lookup user from clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }
    const userId = user._id;

    const guestCart = await ctx.db
      .query("carts")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .first();

    if (!guestCart || guestCart.items.length === 0) {
      return { success: true, merged: false };
    }

    let userCart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (!userCart) {
      // Create user cart with guest items
      await ctx.db.insert("carts", {
        userId,
        guestId: undefined,
        items: guestCart.items,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Merge items
      const mergedItems = [...userCart.items];

      for (const guestItem of guestCart.items) {
        const existingIndex = mergedItems.findIndex(
          item => item.productId === guestItem.productId && item.variationId === guestItem.variationId
        );

        if (existingIndex >= 0) {
          mergedItems[existingIndex].quantity += guestItem.quantity;
        } else {
          mergedItems.push(guestItem);
        }
      }

      await ctx.db.patch(userCart._id, {
        items: mergedItems,
        updatedAt: now,
      });
    }

    // Clear guest cart
    await ctx.db.patch(guestCart._id, {
      items: [],
      updatedAt: now,
    });

    return { success: true, merged: true };
  },
});
