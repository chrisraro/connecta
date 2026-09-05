import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled jobs (Phase 4).
 *
 * Daily plan-expiry sweep: users whose paid plan expired more than the 3-day
 * grace period ago are auto-downgraded to "free". See
 * convex/billing.ts:internalDowngradeExpired.
 */
const crons = cronJobs();

crons.daily(
  "downgrade-expired-plans",
  { hourUTC: 18, minuteUTC: 0 }, // ~02:00 PHT
  internal.billing.internalDowngradeExpired,
  {},
);

export default crons;
