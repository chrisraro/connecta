import { expect, test } from "vitest";
import { profilePath, profileUrl } from "./profileUrl";

test("profilePath prefers the vanity slug when present", () => {
  expect(profilePath({ slug: "christian-raro", _id: "abc123" })).toBe("/christian-raro");
});

test("profilePath falls back to /p/<id> when there is no slug", () => {
  expect(profilePath({ slug: undefined, _id: "abc123" })).toBe("/p/abc123");
});

test("profilePath falls back to /p/<id> when slug is null", () => {
  expect(profilePath({ slug: null, _id: "abc123" })).toBe("/p/abc123");
});

test("profilePath falls back to /p/<id> when slug is an empty string", () => {
  expect(profilePath({ slug: "", _id: "abc123" })).toBe("/p/abc123");
});

test("profileUrl joins an origin with the resolved path", () => {
  expect(profileUrl("https://herald.ph", { slug: "jane-doe", _id: "xyz" })).toBe(
    "https://herald.ph/jane-doe"
  );
});

test("profileUrl strips a trailing slash from the origin before joining", () => {
  expect(profileUrl("https://herald.ph/", { slug: undefined, _id: "xyz" })).toBe(
    "https://herald.ph/p/xyz"
  );
});
