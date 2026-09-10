import { expect, test } from "vitest";
import { profilePath, profileUrl } from "./profileUrl";

test("profilePath prefers the vanity slug when present", () => {
  expect(profilePath({ slug: "christian-raro", id: "abc123" })).toBe("/christian-raro");
});

test("profilePath falls back to /p/<id> when there is no slug", () => {
  expect(profilePath({ slug: undefined, id: "abc123" })).toBe("/p/abc123");
});

test("profilePath falls back to /p/<id> when slug is null", () => {
  expect(profilePath({ slug: null, id: "abc123" })).toBe("/p/abc123");
});

test("profilePath falls back to /p/<id> when slug is an empty string", () => {
  expect(profilePath({ slug: "", id: "abc123" })).toBe("/p/abc123");
});

test("profileUrl joins an origin with the resolved path", () => {
  expect(profileUrl("https://connecta.example", { slug: "jane-doe", id: "xyz" })).toBe(
    "https://connecta.example/jane-doe",
  );
});

test("profileUrl strips a trailing slash from the origin before joining", () => {
  expect(profileUrl("https://connecta.example/", { slug: undefined, id: "xyz" })).toBe(
    "https://connecta.example/p/xyz",
  );
});
