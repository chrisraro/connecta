import { expect, test, vi } from "vitest";
import { classifyNfcWriteError, withRetries } from "./nfc";

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
