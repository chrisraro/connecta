import { v } from "convex/values";
import {
  query,
  action,
  internalMutation,
  internalQuery,
  QueryCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthedUser, isActiveAdmin } from "./authz";
import { readShopSettings, computeTotals } from "./settings";
import { checkRateLimit } from "./rateLimit";

/**
 * Compute the discount amount (centavos) for a given code + subtotal.
 * Shared between the public `validateDiscount` query and `createOrder` so the
 * server stays the single source of truth. Throws on invalid/expired codes.
 */
async function resolveDiscount(
  ctx: QueryCtx,
  code: string,
  subtotal: number
): Promise<number> {
  const discount = await ctx.db
    .query("discounts")
    .withIndex("by_code", (q) => q.eq("code", code))
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

// Task 18 / I3 — validateDiscount is public and unauthenticated (anyone
// loading /shop/cart can call it pre-auth), and it confirms both a code's
// validity AND its exact value — an unmetered oracle a scripted caller could
// hammer with a wordlist of guessable promo codes. Two-tier cap mirroring
// convex/leads.ts's VISITOR_MAX/OWNER_AGGREGATE_MAX pattern for the same "no
// stable per-caller identity" problem (Convex actions don't receive the
// caller's IP either): PER_VISITOR_MAX scopes the familiar cap to a
// client-generated, localStorage-persisted id, and GLOBAL_MAX is the
// backstop bounding total validation attempts shop-wide even when every call
// brings a freshly rotated visitor id.
const DISCOUNT_VALIDATE_VISITOR_MAX = 10;
const DISCOUNT_VALIDATE_GLOBAL_MAX = 30;

// Internal: check-and-record one discount-validation attempt. See the
// comment above `validateDiscount` below for why this had to become an
// action + internal-function split in the first place (queries cannot
// write, so there was previously no way to meter this at all).
export const recordDiscountValidationAttempt = internalMutation({
  args: { visitorId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await checkRateLimit(ctx, `discount-validate:${args.visitorId ?? "anon"}`, {
      max: DISCOUNT_VALIDATE_VISITOR_MAX,
      windowMs: 60_000,
    });
    await checkRateLimit(ctx, `discount-validate:global`, {
      max: DISCOUNT_VALIDATE_GLOBAL_MAX,
      windowMs: 60_000,
    });
  },
});

// Internal: the actual (non-throwing) validation logic, unchanged from
// before other than living in its own query. Called via ctx.runQuery from
// the `validateDiscount` action below, after the rate-limit gate passes.
export const checkDiscountValidity = internalQuery({
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

/**
 * Public entry point: validate a discount code against a provided subtotal
 * (centavos). Returns a non-throwing result so the cart/checkout UI can show
 * inline errors — same shape as before. The server remains the source of
 * truth — createOrder re-validates. An action, not a query, so it can meter
 * itself via ctx.runMutation before revealing anything (see
 * recordDiscountValidationAttempt above); unlike a query this is not
 * reactive, so client callers use useAction and hold the result in local
 * state (see app/shop/cart/page.tsx, app/shop/checkout/page.tsx).
 */
type DiscountValidityResult =
  | { valid: false; error: string }
  | {
      valid: true;
      code: string;
      type: "percentage" | "fixed";
      value: number;
      discountAmount: number;
    };

export const validateDiscount = action({
  args: {
    code: v.string(),
    subtotal: v.number(),
    // Client-generated, localStorage-persisted per-browser id (not
    // authenticated — the caller is always anonymous here). Optional so an
    // old cached client bundle degrades to sharing the "anon" bucket instead
    // of a hard validator error.
    visitorId: v.optional(v.string()),
  },
  // Explicit return type annotation: without it, this action's handler
  // return type is inferred FROM `internal.checkout.checkDiscountValidity`,
  // whose generated type in turn depends on this module's own exports —
  // TypeScript reports that cycle as "implicitly has type 'any' because it
  // does not have a type annotation and is referenced directly or indirectly
  // in its own initializer" (see convex/cards.ts's actions for the same
  // pattern/reasoning).
  handler: async (ctx, args): Promise<DiscountValidityResult> => {
    await ctx.runMutation(internal.checkout.recordDiscountValidationAttempt, {
      visitorId: args.visitorId,
    });
    return await ctx.runQuery(internal.checkout.checkDiscountValidity, {
      code: args.code,
      subtotal: args.subtotal,
    });
  },
});

const createOrderArgs = {
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
};

const ORDER_MAX = 5;
const ORDER_GLOBAL_MAX = 100;

// Internal: check-and-record one order-creation attempt, keyed by the
// caller's trusted Convex user id when authenticated, falling back to the
// client-supplied guestId for anonymous checkout. This has to be its own
// mutation, separate from `performCreateOrder`, for the same reason as
// convex/cards.ts's `recordActivationAttempt` (Task 18 / I3, the same
// atomic-rollback bug already fixed there in Task 1 and in convex/leads.ts
// earlier in this task): `performCreateOrder` throws on attacker-reachable
// conditions AFTER a rate-limit write would otherwise have already happened
// in the same transaction — empty cart, out-of-stock item, invalid/expired
// discount code — and Convex mutations are atomic, so that write would be
// rolled back right along with the throw. Committing it here, via
// `ctx.runMutation` from the `createOrder` action below (itself not one
// atomic transaction), makes it survive.
//
// The per-key cap is keyed on `userId ?? guestId ?? "anon"`; `guestId` is
// CLIENT-SUPPLIED (see contexts/CartContext.tsx), so a scripted caller can
// trivially rotate it to dodge that cap entirely. `order:global` is the
// backstop — it bounds total order-creation attempts shop-wide even when
// every call brings a fresh guest id, mirroring convex/leads.ts's
// OWNER_AGGREGATE_MAX pattern for the same "no stable per-caller identity"
// problem.
export const recordOrderAttempt = internalMutation({
  args: { guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authedUser = await getAuthedUser(ctx);
    const key = authedUser?._id ?? args.guestId ?? "anon";
    await checkRateLimit(ctx, `order:${key}`, { max: ORDER_MAX, windowMs: 60_000 });
    await checkRateLimit(ctx, `order:global`, { max: ORDER_GLOBAL_MAX, windowMs: 60_000 });
  },
});

// Internal: the actual order-creation logic, unchanged from before other
// than living in its own mutation and no longer doing the rate-limit
// bookkeeping itself (that now happens in `recordOrderAttempt` above).
// Called from the `createOrder` action after the rate-limit gate passes.
export const performCreateOrder = internalMutation({
  args: createOrderArgs,
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

// Public entry point. An action rather than a mutation — see
// `recordOrderAttempt` above for why. Client callers use `useAction`, not
// `useMutation`; the calling convention (resolves on success, rejects on
// error) is otherwise identical.
export const createOrder = action({
  args: createOrderArgs,
  handler: async (
    ctx,
    args
  ): Promise<{
    orderId: Id<"orders">;
    orderNumber: string;
    total: number;
    currency: string;
    discountCode: string | undefined;
  }> => {
    await ctx.runMutation(internal.checkout.recordOrderAttempt, {
      guestId: args.guestId,
    });
    return await ctx.runMutation(internal.checkout.performCreateOrder, args);
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
        .withIndex("by_paymentIntentId", (q) =>
          q.eq("paymentIntentId", args.paymentIntentId)
        )
        .first();
    }

    if (!order) {
      return { success: false, reason: "order_not_found" };
    }

    // Once an order has reached a terminal payment state, ANY further
    // webhook — duplicate, replayed, stale, or out-of-order — must be a
    // no-op: no status change, no inventory re-decrement, no discount
    // re-increment, no duplicate confirmation email. "paid" was already
    // terminal for a trailing "failed" (side effects already ran and must
    // not be silently undone). "refunded" must be terminal too: a
    // duplicate/replayed "paid" delivered after an admin has already
    // processed a refund (which restored inventory) would otherwise
    // re-decrement inventory, re-increment discount usage, and re-email the
    // customer for money that was given back.
    const TERMINAL_PAYMENT_STATUSES = new Set(["paid", "refunded"]);
    if (TERMINAL_PAYMENT_STATUSES.has(order.paymentStatus)) {
      return {
        success: true,
        alreadyProcessed: true,
        note: `ignored_stale_status_after_${order.paymentStatus}`,
      };
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

    // Re-validate stock and the discount's usage limit HERE, immediately
    // before committing, instead of trusting the create-time check — closes
    // the overselling / usage-limit-bypass race between two orders paid
    // concurrently for the same last-unit product or single-use code
    // (Backend #1/#2/#3, Payments #3/#4). This only runs on the pending->paid
    // path: the guards above already returned early for paid->paid and
    // paid->non-paid, so an order can't be re-decremented or double-failed.
    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      if (product && product.trackInventory && product.inventory < item.quantity) {
        await ctx.db.patch(order._id, {
          paymentStatus: "failed",
          status: order.status,
          updatedAt: Date.now(),
        });
        return { success: false, reason: "insufficient_stock" };
      }
      if (item.variationId) {
        const variation = await ctx.db.get(item.variationId);
        if (variation && variation.inventory < item.quantity) {
          await ctx.db.patch(order._id, {
            paymentStatus: "failed",
            status: order.status,
            updatedAt: Date.now(),
          });
          return { success: false, reason: "insufficient_stock" };
        }
      }
    }

    if (order.appliedDiscountCode) {
      const discount = await ctx.db
        .query("discounts")
        .withIndex("by_code", (q) => q.eq("code", order.appliedDiscountCode!))
        .first();
      // Mirror every create-time check from `resolveDiscount` above, not just
      // usageLimit — an admin can deactivate a code or it can pass its
      // validUntil expiry while an order sits "pending" with that code
      // already applied. Re-checking only usageLimit here would let a
      // since-deactivated/expired code still be honored (and usedCount still
      // incremented) at payment-confirmation time (Task 3 review finding).
      const discountNow = Date.now();
      if (
        discount &&
        ((discount.usageLimit !== undefined &&
          discount.usedCount >= discount.usageLimit) ||
          discount.isActive === false ||
          discountNow < discount.validFrom ||
          (discount.validUntil && discountNow > discount.validUntil))
      ) {
        await ctx.db.patch(order._id, {
          paymentStatus: "failed",
          status: order.status,
          updatedAt: Date.now(),
        });
        return { success: false, reason: "discount_limit_reached" };
      }
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
