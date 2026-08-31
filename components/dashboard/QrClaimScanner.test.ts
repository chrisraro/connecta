import { expect, test } from "vitest";
import { parseQrPayload } from "./QrClaimScanner";

/**
 * The parser ignores the host entirely and keys on the /t/<uuid> path shape,
 * so a card written against any deployment host resolves. These fixtures
 * cover the current host plus a local dev origin.
 */
test("parses /t/ URLs regardless of host", () => {
  for (const host of [
    "https://connecta.vercel.app",
    "http://localhost:3000",
  ]) {
    expect(parseQrPayload(`${host}/t/04:a3:5b:12`)).toEqual({
      kind: "uuid",
      uuid: "04:a3:5b:12",
    });
  }
});

test("decodes percent-encoded NFC serials (colons survive a URL round-trip)", () => {
  expect(parseQrPayload("https://connecta.vercel.app/t/04%3Aa3%3A5b")).toEqual({
    kind: "uuid",
    uuid: "04:a3:5b",
  });
});

test("ignores query strings and fragments after the uuid", () => {
  expect(parseQrPayload("https://connecta.vercel.app/t/abc-123?utm=x#y")).toEqual({
    kind: "uuid",
    uuid: "abc-123",
  });
});

test("accepts a bare 6-char activation code, uppercased", () => {
  expect(parseQrPayload(" ac3f7k ")).toEqual({ kind: "code", code: "AC3F7K" });
});

test("rejects unrelated payloads instead of claiming garbage", () => {
  expect(parseQrPayload("https://example.com/menu")).toBeNull();
  expect(parseQrPayload("WIFI:T:WPA;S:home;P:pw;;")).toBeNull();
  expect(parseQrPayload("hello")).toBeNull();
});
