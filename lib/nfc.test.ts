import { expect, test, vi } from "vitest";
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
  const result = classifyNfcWriteError(
    domException("NotReadableError", "Failed to write due to an IO error: null"),
  );
  expect(result.kind).toBe("tag-lost");
  expect(result.userMessage).toMatch(/hold the card still/i);
  expect(result.userMessage).toMatch(/retry/i);
});

test("classifies NotReadableError's raw 'IO error: null' text without ever surfacing the literal null", () => {
  const result = classifyNfcWriteError(
    domException("NotReadableError", "Failed to write due to an IO error: null"),
  );
  expect(result.userMessage).not.toMatch(/\bnull\b/);
});

test("classifies NetworkError as tag-lost", () => {
  const result = classifyNfcWriteError(domException("NetworkError", "Network error."));
  expect(result.kind).toBe("tag-lost");
});

test("classifies an error whose message contains 'IO error' as tag-lost even with an unrelated name", () => {
  const result = classifyNfcWriteError(
    domException("UnknownError", "Failed to write due to an IO error: null"),
  );
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
    domException("NotAllowedError", "Failed to write due to an IO error: null"),
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

// The duplicate check must key off a STRUCTURED code, never message text.
//
// The original bug was a `/already exists/i` regex against the message. That
// could not fire in production, where Convex redacted the message to a fixed
// string -- so an admin re-tapping an already-registered card fell into the
// generic retry path with the scan session still alive, looping forever on
// the same tag.
//
// The transport changed but the discipline did not: admin_register_card
// raises with `detail = DUPLICATE_UUID` beside a human sentence in `message`,
// and errorCode() reads the former. Rewording the sentence must not change
// behaviour.

test("returns true for the database duplicate code", () => {
  const err = {
    code: "P0001",
    message: "Card with UUID 04:a3:5b:12:6f:80:81 already exists",
    details: "DUPLICATE_UUID",
    hint: "",
  };
  expect(isDuplicateRegistrationError(err)).toBe(true);
});

// The regression the code channel exists to prevent: the wording is right
// there in the message, and a text match would pass.
test("returns false when only the message says it, with no code", () => {
  const err = {
    code: "P0001",
    message: "Card with UUID 04:a3:5b:12:6f:80:81 already exists",
    details: "",
    hint: "",
  };
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("returns false for an unrelated application code", () => {
  const err = { code: "P0001", message: "Card not found.", details: "CARD_NOT_FOUND", hint: "" };
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("returns false for a raw Postgres error with diagnostic prose in details", () => {
  const err = {
    code: "23505",
    message: "duplicate key value violates unique constraint cards_uuid_key",
    details: "Key (uuid)=(04:a3:5b:12:6f:80:81) already exists.",
    hint: "",
  };
  expect(isDuplicateRegistrationError(err)).toBe(false);
});

test("isDuplicateRegistrationError returns false for a non-Error thrown value", () => {
  expect(isDuplicateRegistrationError("just a string")).toBe(false);
  expect(isDuplicateRegistrationError(null)).toBe(false);
  expect(isDuplicateRegistrationError(undefined)).toBe(false);
});
