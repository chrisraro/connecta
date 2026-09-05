import { expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { toUserMessage, GENERIC_ERROR_MESSAGE } from "./errors";

// Fixtures below are REAL observed error shapes captured during the
// production audit (.superpowers/sdd/audit-journey.md), not invented ones —
// see task-15-brief.md. toUserMessage must never surface a stack trace, the
// "[CONVEX ...]" transport envelope, or the literal string "Server Error".

// --- Real transport-noise strings (thrown as plain Error.message) ---------

test("unwraps a ConvexError serialized inline inside the CONVEX transport envelope, preferring its JSON .message", () => {
  const raw =
    '[CONVEX M(admin:registerSingleCard)] [Request ID: 36342dc88111b743] Server Error\nUncaught ConvexError: {"code":"DUPLICATE_UUID","uuid":"x","message":"Card with UUID x already exists"}\n  Called by client';
  const err = new Error(raw);
  expect(toUserMessage(err)).toBe("Card with UUID x already exists");
});

test("unwraps a plain Error thrown from a Convex handler down to its own message, dropping the transport envelope and stack frame", () => {
  const raw =
    "[CONVEX M(cards:claimCardByUuid)] [Request ID: 392994f0dc9c29a6] Server Error\nUncaught Error: Upgrade to Pro to activate more than one card.\n  at assertCanActivateCard (../convex/cards.ts:26:8)";
  const err = new Error(raw);
  expect(toUserMessage(err)).toBe("Upgrade to Pro to activate more than one card.");
});

test("falls back to a friendly generic for the redacted production shape, never showing the literal 'Server Error'", () => {
  // The exact string a real production Convex deployment sends to the
  // client for an uncaught, non-ConvexError throw once messages are
  // redacted — no "Uncaught ..." detail survives at all.
  const err = new Error("[CONVEX M(admin:registerSingleCard)] Server Error");
  const message = toUserMessage(err);
  expect(message).not.toMatch(/Server Error/);
  expect(message.length).toBeGreaterThan(0);
});

// --- Real ConvexError instances (carrying structured, unredacted .data) ---

test("prefers a ConvexError instance's data.message over anything else", () => {
  const err = new ConvexError({
    code: "DUPLICATE_UUID",
    uuid: "04:a3:5b:12:6f:80:81",
    message: "Card with UUID 04:a3:5b:12:6f:80:81 already exists",
  });
  expect(toUserMessage(err)).toBe("Card with UUID 04:a3:5b:12:6f:80:81 already exists");
});

test("falls back to a friendly generic for a ConvexError data code with no message, never showing the raw code", () => {
  const err = new ConvexError({ code: "SOME_OTHER_ERROR" });
  const message = toUserMessage(err);
  expect(message).not.toMatch(/SOME_OTHER_ERROR/);
  expect(message.length).toBeGreaterThan(0);
});

test("uses a ConvexError's plain string data verbatim", () => {
  const err = new ConvexError("Please choose a different slug.");
  expect(toUserMessage(err)).toBe("Please choose a different slug.");
});

// --- Generic / defensive shapes --------------------------------------------

test("returns a plain, non-Convex Error's own message unchanged", () => {
  const err = new Error("Please upload an image file.");
  expect(toUserMessage(err)).toBe("Please upload an image file.");
});

test("never leaks a raw stack trace line for an unwrapped Convex error", () => {
  const raw =
    "[CONVEX M(cards:claimCardByUuid)] [Request ID: 392994f0dc9c29a6] Server Error\nUncaught Error: Upgrade to Pro to activate more than one card.\n  at assertCanActivateCard (../convex/cards.ts:26:8)";
  const message = toUserMessage(new Error(raw));
  expect(message).not.toMatch(/\bat\b.*convex\.ts/);
  expect(message).not.toMatch(/Request ID/);
});

test("falls back to a friendly generic for a non-Error thrown value", () => {
  const message = toUserMessage("just a string");
  expect(message.length).toBeGreaterThan(0);
});

test("falls back to a friendly generic for null/undefined", () => {
  expect(toUserMessage(null).length).toBeGreaterThan(0);
  expect(toUserMessage(undefined).length).toBeGreaterThan(0);
});

test("falls back to a friendly generic for an Error with an empty message", () => {
  const message = toUserMessage(new Error(""));
  expect(message.length).toBeGreaterThan(0);
});

// --- Post-unwrap leak guard (production-audit review findings 1-5) --------
//
// toUserMessage's "never leak [CONVEX / Server Error / stack traces" guard
// must be re-applied to whatever unwrapConvexTransportNoise successfully
// extracts, not just to the raw pre-unwrap string on the fallback path.

test("finding 1: an empty inner detail followed by a stack frame never leaks the stack frame line", () => {
  // Real shape: the server threw with no message text at all (or the detail
  // was otherwise empty), so "Uncaught Error: " is immediately followed by
  // the stack frame on the next line. Pre-fix, the greedy `\s*` after the
  // colon in UNCAUGHT_DETAIL_RE ate the newline+indent the stop-alternative
  // needed as a delimiter, so the lazy capture group swallowed the stack
  // frame itself, producing the raw stack line "at foo (../convex/x.ts:1:1)"
  // as the "user-safe" message.
  const raw = "[CONVEX M(x:y)] Server Error\nUncaught Error: \n  at foo (../convex/x.ts:1:1)";
  const message = toUserMessage(new Error(raw));
  expect(message).not.toMatch(/at foo/);
  expect(message).not.toMatch(/convex\/x\.ts/);
  expect(message).toBe(GENERIC_ERROR_MESSAGE);
});

test("finding 2: an inner detail that is literally 'Server Error' is caught post-unwrap", () => {
  // A server-side `throw new Error("Server Error")` unwraps "successfully"
  // to the literal forbidden string. The guard only ran on the raw fallback
  // path pre-fix, so this sailed through unchallenged.
  const raw =
    "[CONVEX M(x:y)] [Request ID: abc] Server Error\nUncaught Error: Server Error\n  at handler (../convex/x.ts:5:5)";
  const message = toUserMessage(new Error(raw));
  expect(message).not.toBe("Server Error");
  expect(message).toBe(GENERIC_ERROR_MESSAGE);
});

test("finding 3: a nested/double-wrapped envelope is not returned verbatim", () => {
  // The "Uncaught ..." detail is itself shaped like a full Convex envelope
  // (e.g. an action that calls another action and re-throws its raw error).
  // No known code path produces this today, but the same post-unwrap guard
  // that closes findings 1-2 must also catch it as defense in depth, rather
  // than needing a bespoke nested-envelope special case.
  const raw =
    "[CONVEX M(billing:upgrade)] [Request ID: abc] Server Error\nUncaught Error: [CONVEX A(payrex:createCheckoutSession)] [Request ID: def] Server Error\n  at foo (../convex/billing.ts:10:2)";
  const message = toUserMessage(new Error(raw));
  expect(message).not.toMatch(/\[CONVEX/);
  expect(message).not.toMatch(/Request ID/);
  expect(message).toBe(GENERIC_ERROR_MESSAGE);
});

test("finding 4: a real diagnostic message that merely ends in 'Server Error' keeps its detail", () => {
  // convex/payrex.ts:120-122 throws
  // `PayRex checkout session creation failed (500): Internal Server Error`.
  // The guard must not genericize every message ending in those two words —
  // only the literal Convex-envelope shape. This message is legitimate,
  // specific, user-facing diagnostic text and must survive intact.
  const raw =
    "[CONVEX A(payrex:createCheckoutSession)] [Request ID: xyz] Server Error\nUncaught Error: PayRex checkout session creation failed (500): Internal Server Error\n  at handler (../convex/payrex.ts:120:11)";
  const message = toUserMessage(new Error(raw));
  expect(message).toBe("PayRex checkout session creation failed (500): Internal Server Error");
});

test("finding 5: a very long message is truncated with an ellipsis instead of rendering as a wall of text", () => {
  const raw = "A".repeat(50000);
  const message = toUserMessage(new Error(raw));
  expect(message.length).toBeLessThan(1000);
  expect(message.endsWith("...")).toBe(true);
});

// --- Adversarial sweep follow-ups (found while probing the fix above) -----

test("does not genericize legitimate text that merely contains the substring 'Called by client'", () => {
  // Un-anchored, the "Called by client" defense-in-depth check would
  // false-positive on ordinary prose, not just the real envelope trailer.
  const message = toUserMessage(new Error("The order was Called by client twice."));
  expect(message).toBe("The order was Called by client twice.");
});

test("truncating a very long message does not split a surrogate pair into an invalid lone surrogate", () => {
  const raw = "\u{1F4A5}".repeat(500); // 💥, a 2-code-unit emoji
  const message = toUserMessage(new Error(raw));
  // A lone surrogate (unpaired \uD800-\uDFFF) means the truncation cut an
  // emoji in half. String.prototype.isWellFormed (Node 20+) reports that.
  expect(message.isWellFormed ? message.isWellFormed() : true).toBe(true);
  expect(message.endsWith("...")).toBe(true);
});
