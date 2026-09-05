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
//
// The gap between the colon and the captured detail uses `[^\S\n]*`
// (horizontal whitespace only), NOT `\s*`. `\s*` also matches newlines, so
// when the detail is empty it would eat the newline+indent that the
// stop-alternative below needs as a delimiter, letting the lazy capture
// group swallow the stack frame itself instead of stopping before it.
const UNCAUGHT_DETAIL_RE =
  /Uncaught (?:\w+):[^\S\n]*([\s\S]*?)(?:\n\s*(?:at\s|Called by client)|$)/;

// A message is unsafe to show a user if it's empty, if it's (or contains) a
// raw Convex transport envelope, if it's exactly the meaningless literal
// "Server Error", or if it's a raw stack-trace line. This is intentionally
// narrow: a message that merely *ends* with the words "Server Error" (e.g.
// "PayRex checkout session creation failed (500): Internal Server Error")
// is legitimate diagnostic text and must NOT be caught here — only the
// literal Convex-envelope shape is unsafe.
//
// This is the single predicate applied to BOTH candidate messages
// toUserMessage ever considers showing: the raw fallback string when
// unwrapping fails, and whatever unwrapConvexTransportNoise successfully
// extracts. A leak closed on one path and not the other is how findings 1-3
// happened — every candidate must clear the same bar.
const CONVEX_ENVELOPE_PREFIX_RE = /^\[CONVEX\b/;
const LITERAL_SERVER_ERROR_RE = /^Server Error$/;
const STACK_FRAME_LINE_RE = /(^|\n)[^\S\n]*at\s+\S.*:\d+:\d+\)?[^\S\n]*($|\n)/;
// Anchored to its own line (optionally the whole candidate): the real
// trailer only ever appears as a standalone line at the end of the
// envelope. Un-anchored, this would false-positive on ordinary prose that
// happens to contain the substring "Called by client".
const CALLED_BY_CLIENT_RE = /(^|\n)[^\S\n]*Called by client[^\S\n]*$/;

function isUnsafeToShow(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return true;
  if (CONVEX_ENVELOPE_PREFIX_RE.test(trimmed)) return true;
  if (LITERAL_SERVER_ERROR_RE.test(trimmed)) return true;
  if (STACK_FRAME_LINE_RE.test(trimmed)) return true;
  if (CALLED_BY_CLIENT_RE.test(trimmed)) return true;
  return false;
}

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
    if (fromData) return isUnsafeToShow(fromData) ? null : fromData;
  } catch {
    // Not JSON — inner is already the plain message text.
  }

  return isUnsafeToShow(inner) ? null : inner;
}

function rawMessageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

// Hard cap on how much text a toast/dialog is ever asked to render. A
// message this long is already useless as UX copy regardless of what it
// contains.
const MAX_MESSAGE_LENGTH = 300;

function capLength(message: string): string {
  if (message.length <= MAX_MESSAGE_LENGTH) return message;
  // Slice on code points, not raw UTF-16 code units: a plain `.slice()` can
  // land inside a surrogate pair (e.g. an emoji) and cut it in half,
  // producing a lone, invalid surrogate in the output.
  const codePoints = Array.from(message);
  return `${codePoints
    .slice(0, MAX_MESSAGE_LENGTH - 3)
    .join("")
    .trimEnd()}...`;
}

/**
 * Converts any thrown value into a short, user-safe message. Never returns
 * a stack trace, a "[CONVEX ...]" transport envelope, or the literal
 * "Server Error" — falls back to a friendly generic instead.
 */
export function toUserMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const fromData = messageFromConvexErrorData(err.data);
    if (fromData && !isUnsafeToShow(fromData)) return capLength(fromData);
    // A ConvexError with no usable .data (bare code, or no data at all)
    // falls through to the generic — its .message is Convex's own
    // boilerplate ("[CONVEX ...] Uncaught ConvexError: ..."), not written
    // for end users.
    return GENERIC_ERROR_MESSAGE;
  }

  const raw = rawMessageOf(err).trim();
  if (!raw) return GENERIC_ERROR_MESSAGE;

  // unwrapConvexTransportNoise already re-guards whatever it extracts with
  // isUnsafeToShow — a nested/double-wrapped envelope is caught by that same
  // predicate's `[CONVEX` prefix check, no special case needed — so a
  // non-null result here is always safe to show.
  const unwrapped = unwrapConvexTransportNoise(raw);
  if (unwrapped) return capLength(unwrapped);

  // Either the redacted production shape ("[CONVEX ...] Server Error" with
  // nothing to unwrap), some other unrecognized Convex transport noise, or
  // an unwrap that itself extracted something unsafe — in all cases there's
  // no safe detail left to show.
  if (isUnsafeToShow(raw)) {
    return GENERIC_ERROR_MESSAGE;
  }

  return capLength(raw);
}
