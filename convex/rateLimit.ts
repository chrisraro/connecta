import { ConvexError } from "convex/values";
import { MutationCtx } from "./_generated/server";

const DEFAULT_WINDOW_MS = 60_000;

/**
 * Sliding-window rate limiter backed by the `rateLimits` table. Not
 * IP-based (Convex mutations don't receive the caller's IP) — callers pass
 * a resource-scoped key (e.g. `lead:${ownerId}`, `order:${userId}`) so the
 * limit is "how often can this resource be hit," which is what actually
 * matters for the abuse cases this closes (Security #3, Backend #7).
 *
 * Throws if the caller has exceeded `max` calls for `key` within the
 * current window; otherwise records the call and returns.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  opts: { max: number; windowMs?: number }
): Promise<void> {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!existing || existing.windowStart + windowMs < now) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= opts.max) {
    // ConvexError, not a plain Error: a plain Error's message is redacted to
    // the literal "Server Error" on a real production Convex deployment
    // (lib/errors.ts#toUserMessage recognizes that shape and falls back to
    // a generic message), while ConvexError.data crosses the client/server
    // boundary unmodified. This one function backs the rate limit on
    // activate, claim, tap, the public lead form, and order placement (see
    // convex/cards.ts, convex/leads.ts, convex/checkout.ts, convex/images.ts)
    // — fixing it here fixes "Too many requests" messaging everywhere at once
    // instead of needing the same fix repeated at every call site.
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again in a moment.",
    });
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
