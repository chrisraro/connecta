import { query } from "./_generated/server";

/**
 * Trivial, unauthenticated liveness probe for /api/health. Touches no
 * table and does no work beyond returning a constant, so a failure to
 * reach it means the Convex deployment itself is unreachable (network,
 * deployment down, bad URL) — never a business-logic failure.
 */
export const ping = query({
  args: {},
  handler: async () => {
    return { ok: true } as const;
  },
});

// Secrets whose *presence* (not value) in the Convex deployment's env is
// worth surfacing to /api/health. Keep in sync with README's env table.
const CONFIG_KEYS = [
  "RESEND_API_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type ConfigPresence = Record<(typeof CONFIG_KEYS)[number], boolean>;

/**
 * Reports whether each required secret is SET in the Convex deployment's
 * environment — booleans only, never values, lengths, or prefixes. This is
 * public and unauthenticated by design (it backs the public /api/health
 * route) but is safe by construction: the handler never reads a value into
 * its response, only `Boolean(...)`, so there is nothing for an attacker to
 * extract regardless of how many times they call it.
 *
 * Deliberately NOT rate-limited: it performs zero database reads (this is
 * pure `process.env` access, not a `ctx.db` call), so it carries none of
 * the read-bandwidth cost `convex/rateLimit.ts` exists to bound, and its
 * output space is four booleans with no sensitive content — there is no
 * information an attacker gains by calling it 1 time vs. 100,000 times.
 * Convex's platform-level function-call limits are the appropriate backstop
 * for raw call volume; an app-level limiter would add a mutation-based
 * write path (see checkRateLimit) purely to protect data that isn't secret.
 */
export const checkConfig = query({
  args: {},
  handler: async () => {
    const result = {} as ConfigPresence;
    for (const key of CONFIG_KEYS) {
      result[key] = Boolean(process.env[key]?.trim());
    }
    return result;
  },
});
