import { expect, test, describe } from "vitest";
import { toUserMessage, errorCode, GENERIC_ERROR_MESSAGE } from "./errors";

/**
 * Rewritten for PostgREST.
 *
 * The Convex version tested unwrapping a transport envelope
 * ("[CONVEX M(mod:fn)] ... Uncaught Error: <real message>") and coping with
 * production redacting it to a bare "Server Error". PostgREST has no envelope:
 * errors arrive as { message, details, hint, code }, identically in every
 * environment. What replaces the ConvexError channel is `details`, which
 * carries a stable machine code beside the human sentence in `message`.
 */

// The shape supabase-js hands back for a failed PostgREST call.
const pgError = (over: Partial<Record<string, unknown>> = {}) => ({
  message: "",
  details: "",
  hint: "",
  code: "",
  ...over,
});

describe("toUserMessage", () => {
  test("shows a deliberate raise verbatim -- it was written for a person", () => {
    const err = pgError({
      code: "P0001",
      message: "Upgrade to Pro to activate more than one card.",
      details: "PLAN_LIMIT",
    });
    expect(toUserMessage(err)).toBe("Upgrade to Pro to activate more than one card.");
  });

  // The raw text is "duplicate key value violates unique constraint
  // profiles_slug_lower_key" -- accurate, useless to the reader, and it leaks
  // the schema.
  test("maps a unique violation instead of showing constraint internals", () => {
    const err = pgError({
      code: "23505",
      message: "duplicate key value violates unique constraint profiles_slug_lower_key",
    });
    const shown = toUserMessage(err);
    expect(shown).toBe("That value is already taken. Please choose another.");
    expect(shown).not.toContain("profiles_slug_lower_key");
  });

  // An RLS rejection arrives as 42501. Echoing it tells an attacker exactly
  // which wall they hit.
  test("maps an RLS rejection without naming the policy", () => {
    const err = pgError({
      code: "42501",
      message: 'new row violates row-level security policy for table "profiles"',
    });
    const shown = toUserMessage(err);
    expect(shown).toBe("You do not have permission to do that.");
    expect(shown).not.toContain("row-level security");
  });

  test("maps a foreign key violation to something actionable", () => {
    const err = pgError({ code: "23503", message: "insert or update violates foreign key" });
    expect(toUserMessage(err)).toBe("That item no longer exists. Please refresh and try again.");
  });

  // Supabase Auth errors are already phrased for people and carry no SQLSTATE.
  test("passes an auth error through", () => {
    expect(toUserMessage({ message: "Invalid login credentials" })).toBe(
      "Invalid login credentials",
    );
  });

  test("falls back to the generic message for an unmapped SQLSTATE", () => {
    const err = pgError({ code: "XX000", message: "internal error: something went wrong in wal" });
    expect(toUserMessage(err)).toBe(GENERIC_ERROR_MESSAGE);
  });

  test("handles a plain Error", () => {
    expect(toUserMessage(new Error("Network request failed"))).toBe("Network request failed");
  });

  test("handles a bare string", () => {
    expect(toUserMessage("Something specific")).toBe("Something specific");
  });

  test.each([[null], [undefined], [{}], [42], [[]]])(
    "falls back to the generic message for %p",
    (input) => {
      expect(toUserMessage(input)).toBe(GENERIC_ERROR_MESSAGE);
    },
  );

  test("never returns an empty string", () => {
    expect(toUserMessage(pgError({ code: "P0001", message: "   " }))).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe("errorCode", () => {
  test("reads the machine code out of details", () => {
    expect(errorCode(pgError({ code: "P0001", details: "PLAN_LIMIT" }))).toBe("PLAN_LIMIT");
  });

  // details is also where Postgres puts free-form diagnostic prose on errors we
  // did not raise. Only SCREAMING_SNAKE is treated as a code, so that prose is
  // never mistaken for one.
  test("ignores free-form detail prose", () => {
    expect(
      errorCode(pgError({ code: "23503", details: "Key (owner_id)=(abc) is not present." })),
    ).toBeNull();
  });

  test("returns null for a non-Postgres error", () => {
    expect(errorCode(new Error("boom"))).toBeNull();
    expect(errorCode(null)).toBeNull();
  });
});
