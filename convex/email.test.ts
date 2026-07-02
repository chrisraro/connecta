import { expect, test } from "vitest";
import { escapeHtml } from "./email";

test("escapeHtml neutralizes angle brackets and quotes", () => {
  expect(escapeHtml('<a href="evil">click</a>')).toBe(
    "&lt;a href=&quot;evil&quot;&gt;click&lt;/a&gt;"
  );
});

test("escapeHtml leaves plain text untouched", () => {
  expect(escapeHtml("123 Main St, Manila")).toBe("123 Main St, Manila");
});
