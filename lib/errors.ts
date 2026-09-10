/**
 * Turns whatever a Supabase call rejects with into a short, human-readable
 * string safe to hand straight to a toast.
 *
 * Rewritten for PostgREST. The Convex version unwrapped a transport envelope
 * ("[CONVEX M(mod:fn)] ... Uncaught Error: <real message>") and had to cope
 * with production redacting that envelope down to a bare "Server Error".
 * PostgREST has no envelope: an error arrives as a structured object
 * { message, details, hint, code }, the same shape in every environment.
 *
 * What replaces the old ConvexError channel is `details`. Server code raises
 *
 *     raise exception using errcode = 'P0001',
 *       message = 'Upgrade to Pro to activate more than one card.',
 *       detail  = 'PLAN_LIMIT';
 *
 * so `message` is the sentence to show a person and `details` is the stable
 * machine code callers branch on -- never the message text, which is written
 * for humans and will be reworded.
 *
 * Raw Postgres failures are mapped rather than shown. "duplicate key value
 * violates unique constraint profiles_slug_lower_key" is accurate, useless to
 * the person reading it, and leaks schema internals; the RLS variant
 * ("new row violates row-level security policy") additionally tells an
 * attacker exactly which wall they hit.
 */

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** The structured error supabase-js surfaces for a failed PostgREST call. */
type PostgrestLikeError = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function asPostgrestError(err: unknown): PostgrestLikeError | null {
  if (!err || typeof err !== "object") return null;
  const candidate = err as PostgrestLikeError;
  const hasCode = typeof candidate.code === "string";
  const hasMessage = typeof candidate.message === "string";
  return hasCode || hasMessage ? candidate : null;
}

/**
 * The application error code a raised exception carries in `detail`, or null.
 *
 * Exported so callers can branch on a specific outcome (PLAN_LIMIT,
 * RATE_LIMIT, CARD_NOT_FOUND, ...) without matching on prose.
 */
export function errorCode(err: unknown): string | null {
  const pg = asPostgrestError(err);
  if (!pg) return null;
  if (typeof pg.details === "string" && /^[A-Z_]+$/.test(pg.details.trim())) {
    return pg.details.trim();
  }
  return null;
}

// SQLSTATEs that reach a user through ordinary use. Anything not listed falls
// through to the generic message rather than surfacing raw Postgres text.
const SQLSTATE_MESSAGES: Record<string, string> = {
  // unique_violation -- a slug or SKU somebody else already has
  "23505": "That value is already taken. Please choose another.",
  // foreign_key_violation -- referencing a row that has since been deleted
  "23503": "That item no longer exists. Please refresh and try again.",
  // check_violation -- a value the database refuses as malformed
  "23514": "Some of that information is not in a valid format.",
  // not_null_violation
  "23502": "A required field is missing.",
  // insufficient_privilege, and the RLS rejection that shares it
  "42501": "You do not have permission to do that.",
};

export function toUserMessage(err: unknown): string {
  const pg = asPostgrestError(err);

  if (pg) {
    const code = typeof pg.code === "string" ? pg.code : "";

    // P0001 is a deliberate `raise exception` from our own functions: the
    // message was written to be read by a person, so it is shown verbatim.
    if (code === "P0001" && typeof pg.message === "string" && pg.message.trim()) {
      return pg.message.trim();
    }

    const mapped = SQLSTATE_MESSAGES[code];
    if (mapped) return mapped;

    // Supabase Auth errors (bad password, unconfirmed email) are already
    // phrased for people and carry no SQLSTATE.
    if (!code && typeof pg.message === "string" && pg.message.trim()) {
      return pg.message.trim();
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  if (typeof err === "string" && err.trim()) {
    return err.trim();
  }

  return GENERIC_ERROR_MESSAGE;
}
