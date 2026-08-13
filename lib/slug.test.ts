import { expect, test } from "vitest";
import { slugify, isReservedSlug } from "./slug";

test("lowercases and hyphenates a name", () => {
  expect(slugify("Christian Raro")).toBe("christian-raro");
});

test("strips diacritics and punctuation", () => {
  expect(slugify("José  Ángel O'Brien-Smith!")).toBe("jose-angel-obrien-smith");
});

test("collapses repeated separators and trims them", () => {
  expect(slugify("  --Hello___World--  ")).toBe("hello-world");
});

test("appends a suffix when given", () => {
  expect(slugify("Christian Raro", "7f3")).toBe("christian-raro-7f3");
});

test("returns a stable fallback for input that slugifies to nothing", () => {
  expect(slugify("!!!")).toBe("profile");
});

test("caps length", () => {
  expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
});

test("reserved app routes are rejected as slugs", () => {
  for (const r of ["dashboard", "admin", "shop", "auth", "api", "p", "t"]) {
    expect(isReservedSlug(r), r).toBe(true);
  }
  expect(isReservedSlug("christian-raro")).toBe(false);
});
