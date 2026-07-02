import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthedUser, isActiveAdmin } from "./authz";
import { readShopSettings, computeTotals } from "./settings";

/**
 * Compute the discount amount (centavos) for a given code + subtotal.
 * Shared between the public `validateDiscount` query and `createOrder` so the
 * server stays the single source of truth. Throws on invalid/expired codes.
 */
async function resolveDiscount(
  ctx: { db: any },
  code: string,
  subtotal: number
): Promise<number> {
  const discount = await ctx.db
    .query("discounts")
    .withIndex("by_code", (q: any) => q.eq("code", code))
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

  if (discount.minOrderValue && subtotal < discount.minOrderValue) {
    throw new Error(
      `Minimum order value is PHP ${(discount.minOrderValue / 100).toFixed(2)}`
    );
  }

  let discountAmount: number;
  if (discount.type === "percentage") {
    discountAmount = Math.round(subtotal * (discount.value / 100));
    if (discount.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
    }
  } else {
    discountAmount = discount.value;
  }

  // Never let the discount exceed the subtotal.
  return Math.min(discountAmount, subtotal);
}

/**
 * Public query: validate a discount code against a provided subtotal (centavos).
 * Returns a non-throwing result so the cart/checkout UI can show inline errors.
 * The server remains the source of truth — createOrder re-validates.
 */
export const validateDiscount = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim();
    if (!code) {
      return { valid: false as const, error: "Enter a discount code" };
    }

    const discount = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!discount || !discount.isActive) {
      return { valid: false as const, error: "Invalid discount code" };
    }

    const now = Date.now();
    if (now < discount.validFrom || (discount.validUntil && now > discount.validUntil)) {
      return { valid: false as const, error: "Discount code expired" };
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { valid: false as const, error: "Discount code usage limit reached" };
    }
    if (discount.minOrderValue && args.subtotal < discount.minOrderValue) {
      return {
        valid: false as const,
        error: `Minimum order value is PHP ${(discount.minOrderValue / 100).toFixed(2)}`,
      };
    }

    let discountAmount: number;
    if (discount.type === "percentage") {
      discountAmount = Math.round(args.subtotal * (discount.value / 100));
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
      }
    } else {
      discountAmount = discount.value;
    }
    discountAmount = Math.min(discountAmount, args.subtotal);

    return {
      valid: true as const,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
    };
  },
});

export const createOrder = mutation({
  args: {
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
    paymentProvider: v.literal("payrex"),
    discountCode: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authedUser = await getAuthedUser(ctx);
    const userId = authedUser?._id;

    if (!userId && !args.guestEmail) {
      throw new Error("Authentication or guest email is required");
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

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const cartSubtotal = cart.items.reduce(
      (sum, item) => sum + item.priceAtAdd * item.quantity,
      0
    );

    let discountAmount = 0;
    if (args.discountCode) {
      discountAmount = await resolveDiscount(ctx, args.discountCode, cartSubtotal);
    }

    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product || !product.isPublished) {
          throw new Error(`Product ${item.productId} is no longer available`);
        }

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

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const settings = await readShopSettings(ctx);
    // Tax/shipping are computed off the discounted subtotal so promos reduce
    // the taxable base and can unlock free shipping consistently with the UI.
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const { tax, shipping } = computeTotals(settings, discountedSubtotal);
    const total = subtotal + tax + shipping - discountAmount;

    const orderNumber = generateOrderNumber();
    const now = Date.now();

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId,
      guestEmail: userId ? undefined : args.guestEmail,
      status: "pending",
      items: orderItems,
      subtotal,
      tax,
      shipping,
      discount: discountAmount > 0 ? discountAmount : undefined,
      appliedDiscountCode: discountAmount > 0 ? args.discountCode : undefined,
      total,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(cart._id, {
      items: [],
      updatedAt: now,
    });

    return {
      orderId,
      orderNumber,
      total,
      currency: "PHP",
      discountCode: args.discountCode,
    };
  },
});

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `TF-${year}-${ts}${rand}`;
}

export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: order numbers are not secret (predictable timestamp + 3-char
    // suffix) — never return an order without verifying ownership (Auth #2).
    const user = await getAuthedUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: sign in to view this order");
    }
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
    if (!order) return null;
    const isOwner = order.userId === user._id;
    const isAdmin = await isActiveAdmin(ctx, user._id);
    if (!isOwner && !isAdmin) {
      throw new Error("Unauthorized: you do not have access to this order");
    }
    return order;
  },
});

export const getUserOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);
    if (!user) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return orders;
  },
});

export const getOrderForPayment = internalQuery({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
  },
});

export const attachPayrexSession = internalMutation({
  args: {
    orderNumber: v.string(),
    payrexCheckoutId: v.string(),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(order._id, {
      payrexCheckoutId: args.payrexCheckoutId,
      paymentIntentId: args.paymentIntentId ?? order.paymentIntentId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const internalConfirmOrderPayment = internalMutation({
  args: {
    orderNumber: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    paymentStatus: v.union(
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded")
    ),
  },
  handler: async (ctx, args) => {
    let order: Doc<"orders"> | null = null;
    if (args.orderNumber) {
      order = await ctx.db
        .query("orders")
        .withIndex("by_orderNumber", (q) =>
          q.eq("orderNumber", args.orderNumber!)
        )
        .first();
    }
    if (!order && args.paymentIntentId) {
      order = await ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("paymentIntentId"), args.paymentIntentId))
        .first();
    }

    if (!order) {
      return { success: false, reason: "order_not_found" };
    }

    if (order.paymentStatus === "paid" && args.paymentStatus === "paid") {
      return { success: true, alreadyProcessed: true };
    }

    // A stale/duplicate/out-of-order "failed" webhook must never regress an
    // order that has already been marked "paid" — inventory/discount/email
    // side effects already ran and must not be silently undone (Payments #1
    // follow-up finding from task-2 review).
    if (order.paymentStatus === "paid" && args.paymentStatus !== "paid") {
      return { success: true, alreadyProcessed: true, note: "ignored_stale_status_after_paid" };
    }

    const now = Date.now();

    await ctx.db.patch(order._id, {
      paymentStatus: args.paymentStatus,
      paymentIntentId: args.paymentIntentId ?? order.paymentIntentId,
      status: args.paymentStatus === "paid" ? "processing" : order.status,
      paidAt: args.paymentStatus === "paid" ? now : order.paidAt,
      updatedAt: now,
    });

    if (args.paymentStatus !== "paid") {
      return { success: true };
    }

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

    if (order.appliedDiscountCode) {
      const discount = await ctx.db
        .query("discounts")
        .withIndex("by_code", (q) => q.eq("code", order.appliedDiscountCode!))
        .first();
      if (discount) {
        await ctx.db.patch(discount._id, {
          usedCount: discount.usedCount + 1,
        });
      }
    }

    let toEmail = order.guestEmail ?? "";
    if (order.userId) {
      const orderUser = await ctx.db.get(order.userId);
      if (orderUser?.email) toEmail = orderUser.email;
    }

    if (toEmail) {
      await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
        toEmail,
        orderNumber: order.orderNumber,
        orderTotal: order.total,
        currency: order.currency,
        items: order.items.map((i) => ({
          productName: i.productName,
          variationName: i.variationName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        shippingAddress: order.shippingAddress,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
      });
    }

    return { success: true };
  },
});
