import { expect, test } from "vitest";
import { accountName } from "./accountName";

// B6 (backlog 2026-09-25): Settings read user_metadata.full_name, which email
// sign-ups never set; the name lives in public.users. It was always blank.
test("prefers the name stored in public.users", () => {
  expect(accountName({ name: "Maria Santos" }, { full_name: "Old Name" })).toBe("Maria Santos");
});

test("falls back to the sign-in provider's name", () => {
  expect(accountName(null, { full_name: "Maria Santos" })).toBe("Maria Santos");
  expect(accountName({ name: "  " }, { name: "Maria" })).toBe("Maria");
});

test("is empty when nothing is known", () => {
  expect(accountName(undefined, undefined)).toBe("");
});
