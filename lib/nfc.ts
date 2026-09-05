/**
 * Pure, hardware-free NFC write-error handling for the admin card factory.
 *
 * Chromium's Web NFC implementation reports a lost tag coupling as
 * `DOMException("Failed to write due to an IO error: null", "NotReadableError")`
 * — that trailing "null" is Android's underlying TagLostException message
 * with no text of its own, appended verbatim by Chromium. It is NOT a code
 * bug and there is nothing more specific to report; it is simply what a
 * wobbling/lifted card looks like mid-write. Showing that string to an admin
 * is meaningless and alarming, so every path here classifies the error into
 * a stable `kind` and a hand-written `userMessage` — the raw DOMException
 * text (and its "null") must never reach the UI.
 */

import { ConvexError } from "convex/values";

export type NfcWriteErrorKind = "tag-lost" | "not-supported" | "permission" | "unknown";

export interface ClassifiedNfcWriteError {
  kind: NfcWriteErrorKind;
  userMessage: string;
}

function errorField(err: unknown, field: "name" | "message"): string {
  if (typeof err === "object" && err !== null && field in err) {
    const value = (err as Record<string, unknown>)[field];
    if (typeof value === "string") return value;
  }
  return "";
}

/**
 * Classifies a Web NFC write failure (from `NDEFReader.write()`) into a
 * stable kind plus admin-facing copy. Never echoes the raw DOMException
 * message — Chromium's tag-lost text ends in the literal word "null".
 */
export function classifyNfcWriteError(err: unknown): ClassifiedNfcWriteError {
  const name = errorField(err, "name");
  const message = errorField(err, "message");

  if (name === "NotAllowedError") {
    return {
      kind: "permission",
      userMessage:
        "NFC permission was denied for this site. Allow NFC access in your browser settings and try again.",
    };
  }

  if (name === "NotSupportedError") {
    return {
      kind: "not-supported",
      userMessage:
        "This tag may be write-protected or locked (or too small to hold the data). Try a different card.",
    };
  }

  // Tag lost mid-write: Chromium surfaces this as NotReadableError or
  // NetworkError, and/or a message containing "IO error" — the coupling
  // between the phone and the card broke before the write finished.
  if (name === "NotReadableError" || name === "NetworkError" || /io error/i.test(message)) {
    return {
      kind: "tag-lost",
      userMessage:
        "The card moved during writing. Hold the card still against the back of the phone until the success message shows, then tap Retry.",
    };
  }

  return {
    kind: "unknown",
    userMessage: "Something went wrong writing to the card. Tap Retry.",
  };
}

export interface WithRetriesOptions {
  attempts: number;
  delayMs: number;
}

export interface WithRetriesResult<T> {
  result: T;
  attempts: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying ONLY on a "tag-lost" classified failure (a transient
 * coupling loss — the most common real-world outcome of a wobbling card).
 * Any other classified kind (permission, not-supported, unknown) rethrows
 * immediately since retrying will not help. After the last attempt the
 * original error is rethrown unchanged, so callers can still classify it
 * for display.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  { attempts, delayMs }: WithRetriesOptions,
): Promise<WithRetriesResult<T>> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      const { kind } = classifyNfcWriteError(err);
      if (kind !== "tag-lost" || attempt === attempts) {
        throw err;
      }
      await delay(delayMs);
    }
  }
  // Unreachable: the loop always returns or throws before falling out, but
  // TypeScript can't see that attempts >= 1 makes the final throw exhaustive.
  throw new Error("withRetries: unreachable");
}

/**
 * Detects a "card already registered" failure from `admin.registerSingleCard`.
 *
 * This MUST key off a structured `ConvexError.data.code`, never off thrown
 * message text. Plain `Error` messages thrown from a Convex mutation are
 * redacted client-side to the fixed string "Server Error" on a real
 * production deployment (unlike `ConvexError.data`, which crosses the
 * client/server boundary intact) — a regex against `.message` would only
 * ever fire in dev, where nothing redacts it. If it silently stopped
 * firing in prod, an admin re-tapping an already-registered card would fall
 * into the generic write-retry path with the scan session still alive,
 * looping on the same duplicate tag forever instead of getting the
 * dedicated "already registered" message and having the scanner stop.
 */
export function isDuplicateRegistrationError(err: unknown): boolean {
  if (!(err instanceof ConvexError)) return false;
  const data = err.data as { code?: unknown } | undefined;
  return typeof data === "object" && data !== null && data.code === "DUPLICATE_UUID";
}
