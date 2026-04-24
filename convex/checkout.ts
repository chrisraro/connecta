import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Checkout & Payment Logic
 * 
 * Handles order creation, payment processing, and webhook handling.
 */

// ==========================================
// ORDER CREATION
// ==========================================

// Create order from cart (before payment)
export const createOrder = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestEmail: v.optional(v.string()),
    guestId: v.optional(v.string()),
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
    paymentProvider: v.union(v.literal("stripe"), v.literal("paypal")),
    discountCode: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate either userId or guestEmail is provided
    if (!args.userId && !args.guestEmail) {
      throw new Error("User ID or guest email is required");
    }

    // Get cart
    let cart;
    if (args.userId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    } else if (args.guestId) {
      cart = await ctx.db
        .query("carts")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .first();
    }

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Validate discount code if provided
    let discountAmount = 0;
    if (args.discountCode) {
      const discount = await ctx.db
        .query("discounts")
        .withIndex("by_code", (q) => q.eq("code", args.discountCode!))
        .first();

      if (!discount || !discount.isActive) {
        throw new Error("Invalid discount code");
      }

      const now = Date.now();
      if (now < discount.validFrom || (discount.validUntil && now > discount.validUntil)) {
        throw new Error("Discount code expired");
      }

      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        throw new Error("Discount code usage limit reached");
      }

      // Calculate discount
      const subtotal = cart.items.reduce((sum, item) => sum + (item.priceAtAdd * item.quantity), 0);
      
      if (discount.minOrderValue && subtotal < discount.minOrderValue) {
        throw new Error(`Minimum order value is $${(discount.minOrderValue / 100).toFixed(2)}`);
      }

      if (discount.type === "percentage") {
        discountAmount = Math.round(subtotal * (discount.value / 100));
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
        }
      } else {
        discountAmount = discount.value;
      }

      // Increment usage count
      await ctx.db.patch(discount._id, {
        usedCount: discount.usedCount + 1,
      });
    }

    // Build order items with current prices and validate stock
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product || !product.isPublished) {
          throw new Error(`Product ${item.productId} is no longer available`);
        }

        // Validate stock
        if (product.trackInventory) {
          let availableStock = product.inventory;
          
          if (item.variationId) {
            const variation = await ctx.db.get(item.variationId);
            if (!variation) {
              throw new Error(`Variation not found`);
            }
            availableStock = variation.inventory;
          }

          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        let variationName: string | undefined;
        if (item.variationId) {
          const variation = await ctx.db.get(item.variationId);
          if (variation) {
            variationName = variation.name;
          }
        }

        const unitPrice = item.priceAtAdd;
        const total = unitPrice * item.quantity;

        return {
          productId: item.productId,
          productName: product.name,
          variationId: item.variationId,
          variationName,
          quantity: item.quantity,
          unitPrice,
          total,
        };
      })
    );

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // TODO: Implement tax calculation
    const shipping = 0; // TODO: Implement shipping calculation
    const total = subtotal + tax + shipping - discountAmount;

    // Generate order number
    const orderNumber = await generateOrderNumber(ctx);

    const now = Date.now();

    // Create order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: args.userId,
      guestEmail: args.guestEmail,
      status: "pending",
      items: orderItems,
      subtotal,
      tax,
      shipping,
      discount: discountAmount > 0 ? discountAmount : undefined,
      total,
      currency: "USD",
      paymentProvider: args.paymentProvider,
      paymentStatus: "pending",
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Clear cart
    await ctx.db.patch(cart._id, {
      items: [],
      updatedAt: now,
    });

    // Schedule order confirmation email
    const emailTarget = args.guestEmail || "";
    if (emailTarget) {
      await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
        toEmail: emailTarget,
        orderNumber,
        orderTotal: total,
        currency: "USD",
        items: orderItems,
        shippingAddress: args.shippingAddress,
        subtotal,
        tax,
        shipping,
      });
    }

    return {
      orderId,
      orderNumber,
      total,
      currency: "USD",
    };
  },
});

// Generate unique order number
async function generateOrderNumber(ctx: QueryCtx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TF-${year}`;
  
  // Get count of orders this year
  const allOrders = await ctx.db.query("orders").collect();
  const yearOrders = allOrders.filter((order: Doc<"orders">) => 
    order.orderNumber.startsWith(prefix)
  );
  
  const sequence = (yearOrders.length + 1).toString().padStart(6, "0");
  return `${prefix}-${sequence}`;
}

// ==========================================
// ORDER QUERIES
// ==========================================

// Get order by order number
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    return order;
  },
});

// Get user's orders
export const getUserOrders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return orders;
  },
});

// ==========================================
// PAYMENT HANDLERS (Stubbed - to be implemented with Stripe/PayPal)
// ==========================================

// Confirm order payment (called by webhook)
export const confirmOrderPayment = mutation({
  args: {
    orderNumber: v.string(),
    paymentIntentId: v.string(),
    paymentStatus: v.union(v.literal("paid"), v.literal("failed"), v.literal("refunded")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Update order
    await ctx.db.patch(order._id, {
      paymentStatus: args.paymentStatus,
      paymentIntentId: args.paymentIntentId,
      status: args.paymentStatus === "paid" ? "processing" : order.status,
      updatedAt: now,
    });

    // If payment successful, deduct inventory
    if (args.paymentStatus === "paid") {
      for (const item of order.items) {
        const product = await ctx.db.get(item.productId);
        if (product && product.trackInventory) {
          await ctx.db.patch(product._id, {
            inventory: product.inventory - item.quantity,
          });
        }

        if (item.variationId) {
          const variation = await ctx.db.get(item.variationId);
          if (variation) {
            await ctx.db.patch(variation._id, {
              inventory: variation.inventory - item.quantity,
            });
          }
        }
      }
    }

    return { success: true };
  },
});

// Create Stripe PaymentIntent (stub - requires Stripe SDK)
export const createStripePaymentIntent = mutation({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement with Stripe SDK
    // This requires server-side Stripe integration
    throw new Error("Stripe integration not yet implemented");
  },
});

// Handle Stripe webhook (stub)
export const handleStripeWebhook = mutation({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement Stripe webhook handler
    // Parse webhook, verify signature, update order status
    throw new Error("Stripe webhook not yet implemented");
  },
});

// Create PayPal order (stub)
export const createPayPalOrder = mutation({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement with PayPal SDK
    throw new Error("PayPal integration not yet implemented");
  },
});

// Handle PayPal webhook (stub)
export const handlePayPalWebhook = mutation({
  args: {
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement PayPal webhook handler
    throw new Error("PayPal webhook not yet implemented");
  },
});
