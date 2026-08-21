/**
 * Turns whatever a Convex mutation/action (or any other call site) throws
 * into a short, human-readable string safe to hand straight to a toast.
 *
 * Three real shapes drove this design (captured live during the production
 * audit, see .superpowers/sdd/audit-journey.md and lib/errors.test.ts for
 * the verbatim fixtures):
 *
 * 1. A plain `Error` thrown from a Convex mutation/action arrives on the
 *    client with its message rewritten into a transport envelope:
 *    `"[CONVEX M(mod:fn)] [Request ID: ...] Server Error\nUncaught Error:
 *    <original message>\n  at <stack frame>"`. The original message is
 *    still in there — it needs unwrapping, not showing verbatim.
 * 2. On a REAL PRODUCTION deployment, that envelope is redacted further:
 *    the "Uncaught Error: ..." detail is stripped entirely, leaving just
 *    `"[CONVEX M(mod:fn)] Server Error"`. There is nothing left to unwrap —
 *    this function must recognize that shape and return a generic message,
 *    NEVER the literal "Server Error" (which is meaningless to a user and
 *    looks like the app is broken).
 * 3. `ConvexError` is the one channel that survives redaction intact: its
 *    `.data` payload crosses the client/server boundary unmodified. Server
 *    code that wants a specific, reliable user-facing message throws
 *    `new ConvexError({ code, message })` (see convex/admin.ts) — this
 *    function checks `.data` FIRST, before ever touching `.message`.
 */

import { ConvexError } from "convex/values";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

function messageFromConvexErrorData(data: unknown): string | null {
  if (typeof data === "string") {
    return data.trim() ? data : null;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    // A data.code with no message is still a deliberate, structured signal
    // from the server (see convex/admin.ts's DUPLICATE_UUID) — it's just
    // not one this shared helper knows how to phrase. Callers that care
    // about a specific code should branch on `err.data.code` themselves
    // BEFORE calling toUserMessage (as lib/nfc.ts's
    // isDuplicateRegistrationError already does); this is only the
    // last-resort generic phrasing.
    if (typeof record.code === "string") {
      return null;
    }
  }
  return null;
}

// Matches the "Uncaught <ErrorType>: <message>" section of a Convex
// transport envelope, stopping before the stack frame ("  at ...") or the
// "Called by client" trailer that follows it on a real deployment.
const UNCAUGHT_DETAIL_RE = /Uncaught (?:\w+):\s*([\s\S]*?)(?:\n\s*(?:at\s|Called by client)|$)/;

function unwrapConvexTransportNoise(raw: string): string | null {
  const match = raw.match(UNCAUGHT_DETAIL_RE);
  if (!match) return null;

  const inner = match[1].trim();
  if (!inner) return null;

  // The unwrapped detail is sometimes itself a JSON-encoded ConvexError
  // payload (e.g. a raw string caught outside convex/react's normal
  // ConvexError reconstruction) — prefer its .message the same way a real
  // ConvexError instance's .data would be preferred.
  try {
    const parsed = JSON.parse(inner);
    const fromData = messageFromConvexErrorData(parsed);
    if (fromData) return fromData;
  } catch {
    // Not JSON — inner is already the plain message text.
  }

  return inner;
}

function rawMessageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

/**
 * Converts any thrown value into a short, user-safe message. Never returns
 * a stack trace, a "[CONVEX ...]" transport envelope, or the literal
 * "Server Error" — falls back to a friendly generic instead.
 */
export function toUserMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const fromData = messageFromConvexErrorData(err.data);
    if (fromData) return fromData;
    // A ConvexError with no usable .data (bare code, or no data at all)
    // falls through to the generic — its .message is Convex's own
    // boilerplate ("[CONVEX ...] Uncaught ConvexError: ..."), not written
    // for end users.
    return GENERIC_ERROR_MESSAGE;
  }

  const raw = rawMessageOf(err).trim();
  if (!raw) return GENERIC_ERROR_MESSAGE;

  const unwrapped = unwrapConvexTransportNoise(raw);
  if (unwrapped) return unwrapped;

  // Either the redacted production shape ("[CONVEX ...] Server Error" with
  // nothing to unwrap) or some other unrecognized Convex transport noise —
  // in both cases there's no safe detail left to show.
  if (raw.startsWith("[CONVEX") || /Server Error\s*$/.test(raw)) {
    return GENERIC_ERROR_MESSAGE;
  }

  return raw;
}
