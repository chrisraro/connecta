import { describe, expect, it } from "vitest";
import { TAP } from "./tap";
import { BEATS } from "../timeline";

const tapBeat = BEATS.find((b) => b.id === "tap")!;

describe("TAP staging", () => {
  const { phone, contact } = TAP;
  it("contacts the phone's top third (NFC reader sits at the top back)", () => {
    expect(contact.y).toBeGreaterThanOrEqual(phone.y);
    expect(contact.y).toBeLessThanOrEqual(phone.y + phone.height / 3);
  });
  it("contacts within the phone's width", () => {
    expect(contact.x).toBeGreaterThanOrEqual(phone.x);
    expect(contact.x).toBeLessThanOrEqual(phone.x + phone.width);
  });
  it("lands the contact frame on the 120 BPM beat grid, inside the beat", () => {
    expect((tapBeat.from + TAP.contactFrame) % 15).toBe(0);
    expect(TAP.contactFrame).toBeGreaterThan(0);
    expect(TAP.contactFrame + 40).toBeLessThan(tapBeat.frames);
  });
  it("keeps the card's hidden part behind the phone and its visible part above or beside it", () => {
    expect(TAP.card.y).toBeLessThan(phone.y);
    expect(TAP.card.y + TAP.card.height).toBeGreaterThan(contact.y);
  });
});
