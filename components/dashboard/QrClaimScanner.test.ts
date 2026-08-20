import { expect, test } from "vitest";
import { parseQrPayload } from "./QrClaimScanner";

/**
 * Cards in circulation carry three generations of deployment host after two
 * brand renames — the parser must ignore the host and key on the /t/<uuid>
 * path shape alone. The fixtures below name the retired hosts literally
 * because that is exactly what is printed on already-shipped stock; the two
 * retired-host lines are allowlisted in lib/brand.test.ts.
 */
test("parses /t/ URLs from every host generation", () => {
  for (const host of [
    "https://sigmatap.vercel.app",
    "https://herald-ph.vercel.app",
    "https://tapfolio-beta.vercel.app",
    "http://localhost:3000",
  ]) {
    expect(parseQrPayload(`${host}/t/04:a3:5b:12`)).toEqual({
      kind: "uuid",
      uuid: "04:a3:5b:12",
    });
  }
});

test("decodes percent-encoded NFC serials (colons survive a URL round-trip)", () => {
  expect(parseQrPayload("https://sigmatap.vercel.app/t/04%3Aa3%3A5b")).toEqual({
    kind: "uuid",
    uuid: "04:a3:5b",
  });
});

test("ignores query strings and fragments after the uuid", () => {
  expect(parseQrPayload("https://sigmatap.vercel.app/t/abc-123?utm=x#y")).toEqual({
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
