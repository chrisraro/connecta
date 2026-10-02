import { expect, test, vi } from "vitest";
import { render } from "@testing-library/react";

// Capture what the card asks the QR to encode.
const encoded: string[] = [];
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => {
    encoded.push(value);
    return <svg />;
  },
}));

import { DigitalBusinessCard } from "./digital-business-card";

// The showcase video renders outside the site, where the page origin is the
// studio's localhost; a QR viewers can scan must point at the real site.
test("qrValue overrides the QR target", () => {
  render(<DigitalBusinessCard fullName="A" title="B" phone="" email="" orientation="portrait" qrValue="https://connectaph.vercel.app" />);
  expect(encoded.at(-1)).toBe("https://connectaph.vercel.app");
});

test("without qrValue the card still encodes the page origin", () => {
  render(<DigitalBusinessCard fullName="A" title="B" phone="" email="" orientation="portrait" />);
  expect(encoded.at(-1)).toBe(window.location.origin);
});
