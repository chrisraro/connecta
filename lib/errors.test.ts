import { expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { toUserMessage } from "./errors";

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
