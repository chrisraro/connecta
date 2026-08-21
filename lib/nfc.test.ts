import { expect, test, vi } from "vitest";
import { ConvexError } from "convex/values";
import { classifyNfcWriteError, withRetries, isDuplicateRegistrationError } from "./nfc";

function domException(name: string, message: string): Error {
  // Real Web NFC failures arrive as DOMException, which duck-types as a
  // regular Error with a `.name`. Plain Error + assigned name matches that
  // shape without depending on DOMException being present in the test
  // environment.
  const err = new Error(message);
  err.name = name;
  return err;
}

// --- classifyNfcWriteError -------------------------------------------------

test("classifies NotReadableError as tag-lost with a hold-still, retry message", () => {
  const result = classifyNfcWriteError(domException("NotReadableError", "Failed to write due to an IO error: null"));
  expect(result.kind).toBe("tag-lost");
  expect(result.userMessage).toMatch(/hold the card still/i);
  expect(result.userMessage).toMatch(/retry/i);
});

test("classifies NotReadableError's raw 'IO error: null' text without ever surfacing the literal null", () => {
  const result = classifyNfcWriteError(domException("NotReadableError", "Failed to write due to an IO error: null"));
  expect(result.userMessage).not.toMatch(/\bnull\b/);
});

test("classifies NetworkError as tag-lost", () => {
  const result = classifyNfcWriteError(domException("NetworkError", "Network error."));
  expect(result.kind).toBe("tag-lost");
});

test("classifies an error whose message contains 'IO error' as tag-lost even with an unrelated name", () => {
  const result = classifyNfcWriteError(domException("UnknownError", "Failed to write due to an IO error: null"));
  expect(result.kind).toBe("tag-lost");
  expect(result.userMessage).not.toMatch(/\bnull\b/);
});

test("classifies NotAllowedError as permission", () => {
  const result = classifyNfcWriteError(domException("NotAllowedError", "Permission denied."));
  expect(result.kind).toBe("permission");
  expect(result.userMessage.length).toBeGreaterThan(0);
});

test("classifies NotAllowedError as permission even when its message also contains 'IO error' (name takes precedence over message)", () => {
  // Precedence lock-in: the "IO error" message match only kicks in for
  // names classifyNfcWriteError doesn't already recognize. NotAllowedError
  // is checked first, so a (hypothetical / platform-quirk) NotAllowedError
  // whose message happens to mention "IO error" must still classify as
  // permission, not tag-lost.
  const result = classifyNfcWriteError(
    domException("NotAllowedError", "Failed to write due to an IO error: null")
  );
  expect(result.kind).toBe("permission");
});

test("classifies NotSupportedError as not-supported and mentions the tag may be write-protected", () => {
  const result = classifyNfcWriteError(domException("NotSupportedError", "Not supported."));
  expect(result.kind).toBe("not-supported");
  expect(result.userMessage).toMatch(/write-protected/i);
});

test("classifies an unrecognized error as unknown", () => {
  const result = classifyNfcWriteError(domException("SomeWeirdError", "Something else happened."));
  expect(result.kind).toBe("unknown");
  expect(result.userMessage.length).toBeGreaterThan(0);
});

test("classifies a non-Error thrown value as unknown without throwing", () => {
  const result = classifyNfcWriteError("just a string");
  expect(result.kind).toBe("unknown");
  expect(result.userMessage.length).toBeGreaterThan(0);
});

// --- withRetries -------------------------------------------------------

test("withRetries succeeds on the 3rd try after two tag-lost failures", async () => {
  let calls = 0;
  const fn = vi.fn(async () => {
    calls++;
    if (calls < 3) {
      throw domException("NotReadableError", "Failed to write due to an IO error: null");
    }
    return "written";
  });

  const { result, attempts } = await withRetries(fn, { attempts: 3, delayMs: 1 });

  expect(result).toBe("written");
  expect(attempts).toBe(3);
  expect(fn).toHaveBeenCalledTimes(3);
});

test("withRetries gives up after the configured attempts and rethrows the last tag-lost error", async () => {
  const err = domException("NotReadableError", "Failed to write due to an IO error: null");
  const fn = vi.fn(async () => {
    throw err;
  });

  await expect(withRetries(fn, { attempts: 3, delayMs: 1 })).rejects.toBe(err);
  expect(fn).toHaveBeenCalledTimes(3);
});

test("withRetries does not retry a permission error", async () => {
  const err = domException("NotAllowedError", "Permission denied.");
  const fn = vi.fn(async () => {
    throw err;
  });

  await expect(withRetries(fn, { attempts: 3, delayMs: 1 })).rejects.toBe(err);
  expect(fn).toHaveBeenCalledTimes(1);
});

test("withRetries does not retry a not-supported error", async () => {
  const err = domException("NotSupportedError", "Not supported.");
  const fn = vi.fn(async () => {
    throw err;
  });

  await expect(withRetries(fn, { attempts: 3, delayMs: 1 })).rejects.toBe(err);
  expect(fn).toHaveBeenCalledTimes(1);
});

test("withRetries resolves in one attempt when fn succeeds immediately", async () => {
  const fn = vi.fn(async () => "ok");
  const { result, attempts } = await withRetries(fn, { attempts: 3, delayMs: 1 });
  expect(result).toBe("ok");
  expect(attempts).toBe(1);
  expect(fn).toHaveBeenCalledTimes(1);
});

// --- isDuplicateRegistrationError ------------------------------------------
//
// Regression coverage for a redaction bug: the admin factory page used to
// detect a duplicate card registration by regex-matching `/already exists/i`
// against a thrown Error's `.message`. On a real production Convex
// deployment, plain Error messages thrown from a mutation are redacted
// client-side to the fixed string "Server Error" — so that regex could never
// fire in prod, and an admin re-tapping an already-registered card would
// fall into the generic-retry path with the scan session left alive,
// looping forever. convex/admin.ts now throws a ConvexError carrying
// `{ code: "DUPLICATE_UUID", ... }` in its (unredacted) `.data` for exactly
// this case; detection must key off that data code, never message text.

test("isDuplicateRegistrationError returns true for a ConvexError with data.code DUPLICATE_UUID", () => {
  const err = new ConvexError({ code: "DUPLICATE_UUID", uuid: "04:a3:5b:12:6f:80:81" });
  expect(isDuplicateRegistrationError(err)).toBe(true);
});

test("isDuplicateRegistrationError returns false for a plain Error carrying the redacted production message shape", () => {
  // This is the exact string a real production Convex deployment sends to
  // the client for an uncaught, non-ConvexError throw — the literal text
  // that broke the old `/already exists/i` regex check.
  const err = new Error("[CONVEX M(admin:registerSingleCard)] Server Error");
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("isDuplicateRegistrationError returns false for a ConvexError with an unrelated data code", () => {
  const err = new ConvexError({ code: "SOME_OTHER_ERROR" });
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("isDuplicateRegistrationError returns false for a ConvexError whose data isn't an object with a code", () => {
  const err = new ConvexError("plain string data");
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("isDuplicateRegistrationError returns false for a non-Error thrown value", () => {
  expect(isDuplicateRegistrationError("just a string")).toBe(false);
  expect(isDuplicateRegistrationError(null)).toBe(false);
  expect(isDuplicateRegistrationError(undefined)).toBe(false);
});
