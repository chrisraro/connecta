import { describe, expect, test } from "vitest";
import { contactKind, leadReplyLinks, phoneE164 } from "./leadContact";

// B14 (backlog 2026-09-25): Reply always built a mailto link, even for a
// phone number, with an unencoded subject.
describe("contactKind", () => {
  test.each([
    ["0917 555 0142", "phone"],
    ["+63 917 555 0142", "phone"],
    ["maria@example.com", "email"],
    ["@maria on IG", "other"],
  ])("%s is %s", (contact, kind) => {
    expect(contactKind(contact)).toBe(kind);
  });
});

describe("phoneE164", () => {
  test.each([
    ["0917 555 0142", "+639175550142"],
    ["639175550142", "+639175550142"],
    ["+63 (917) 555-0142", "+639175550142"],
    ["(054) 473 1234", "+63544731234"],
  ])("%s becomes %s", (raw, e164) => {
    expect(phoneE164(raw)).toBe(e164);
  });
});

describe("leadReplyLinks", () => {
  test("an email lead gets one email link with an encoded subject and body", () => {
    const links = leadReplyLinks({ contact: "maria@example.com", subject: "Re: Lot & house", body: "Hi Maria,\nThanks!" });
    expect(links).toEqual([
      {
        channel: "email",
        label: "Email",
        href: "mailto:maria@example.com?subject=Re%3A%20Lot%20%26%20house&body=Hi%20Maria%2C%0AThanks!",
      },
    ]);
  });

  test("a phone lead gets SMS, WhatsApp, Viber and call, never email", () => {
    const links = leadReplyLinks({ contact: "0917 555 0142", subject: "ignored", body: "Hi!" });
    expect(links.map((l) => l.channel)).toEqual(["sms", "whatsapp", "viber", "call"]);
    expect(links[0].href).toBe("sms:+639175550142?&body=Hi!");
    expect(links[1].href).toBe("https://wa.me/639175550142?text=Hi!");
    expect(links[2].href).toBe("viber://chat?number=%2B639175550142");
    expect(links[3].href).toBe("tel:+639175550142");
  });

  test("anything else gets no links", () => {
    expect(leadReplyLinks({ contact: "@maria on IG", subject: "", body: "" })).toEqual([]);
  });
});
