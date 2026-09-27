import { describe, expect, test } from "vitest";
import { buildVCard, escapeVCard, foldVCardLine } from "./vcard";

// B12 (backlog 2026-09-25): Save contact wrote raw values, so an address
// with a comma split into the wrong fields; it had no photo or profile link.
describe("escapeVCard", () => {
  test("escapes backslashes, semicolons, commas and newlines", () => {
    expect(escapeVCard("Unit 2, Magsaysay Ave; Naga\\City\nPH")).toBe(
      "Unit 2\\, Magsaysay Ave\\; Naga\\\\City\\nPH",
    );
  });
});

describe("foldVCardLine", () => {
  test("folds long lines at 75 octets with a leading space", () => {
    const folded = foldVCardLine("NOTE:" + "x".repeat(100));
    const lines = folded.split("\r\n");
    expect(lines[0]).toHaveLength(75);
    expect(lines[1].startsWith(" ")).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe("NOTE:" + "x".repeat(100));
  });

  // Code review (2026-09-27): folding by UTF-16 index split an emoji's
  // surrogate pair across lines, which the Blob encoder turned into U+FFFD.
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const unfold = (s: string) => s.split("\r\n").map((l, i) => (i ? l.slice(1) : l)).join("");

  test("never splits a character, and each line stays within 75 octets", () => {
    const line = "ORG:" + "x".repeat(70) + "😀" + "ñ".repeat(60);
    const folded = foldVCardLine(line);
    expect(unfold(folded)).toBe(line);
    expect(folded).not.toContain("�");
    for (const l of folded.split("\r\n")) {
      expect(bytes(l)).toBeLessThanOrEqual(75);
      expect(l).not.toMatch(/[\uD800-\uDBFF]$|^ ?[\uDC00-\uDFFF]/);
    }
  });
});

describe("buildVCard", () => {
  const agent = {
    fullName: "Maria Santos",
    title: "Broker",
    company: "Santos Realty, Inc.",
    phone: "0917 555 0142",
    email: "maria@example.com",
    website: "https://santos.example",
    address: "12 Magsaysay Ave, Naga City",
  };

  test("uses CRLF line endings and escaped fields", () => {
    const card = buildVCard(agent as never);
    expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
    expect(card).toContain("ORG:Santos Realty\\, Inc.");
    expect(card).toContain("ADR;TYPE=WORK:;;12 Magsaysay Ave\\, Naga City;;;;");
    expect(card).toContain("N:Santos;Maria;;;");
  });

  test("adds the profile link and an embedded photo when given", () => {
    const card = buildVCard(agent as never, {
      profileUrl: "https://connectaph.vercel.app/maria-santos",
      photo: { type: "JPEG", base64: "AAAA" },
    });
    expect(card).toContain("URL;TYPE=profile:https://connectaph.vercel.app/maria-santos");
    expect(card).toContain("PHOTO;ENCODING=b;TYPE=JPEG:AAAA");
  });
});
