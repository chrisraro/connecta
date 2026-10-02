import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkinShowcase, SHOWCASE } from "./SkinShowcase";
import { CARD_SKINS } from "@/lib/cardSkins";
import { PERSONAS } from "./IndustryDemo";

// 2026-10-02: the skins section shows real cards for the demo personas,
// framed like physical cards so no skin blends into the page.
describe("SkinShowcase", () => {
  test("one real card per skin, in picker order, each naming its persona", () => {
    render(<SkinShowcase />);
    expect(SHOWCASE.map((s) => s.skin)).toEqual(CARD_SKINS.map((s) => s.id));
    for (const { persona } of SHOWCASE) {
      const p = PERSONAS[persona];
      expect(screen.getByText(p.name)).toBeInTheDocument();
      expect(screen.getByText(p.title)).toBeInTheDocument();
    }
    expect(document.querySelectorAll("[data-digital-card]")).toHaveLength(CARD_SKINS.length);
  });

  test("every card sits in a mock frame with an edge and a shadow", () => {
    render(<SkinShowcase />);
    const frames = [...document.querySelectorAll<HTMLElement>("[data-card-mock]")];
    expect(frames).toHaveLength(CARD_SKINS.length);
    for (const f of frames) {
      expect(f.querySelector("[data-digital-card]")).not.toBeNull();
      // A hairline edge ring plus a drop shadow.
      expect(f.style.boxShadow).toMatch(/0 0 0 1px/);
      expect(f.style.boxShadow.split("),").length).toBeGreaterThanOrEqual(2);
    }
  });

  test("the frame is decorative and the real card itself stays flat (PNG export)", () => {
    render(<SkinShowcase />);
    for (const f of document.querySelectorAll<HTMLElement>("[data-card-mock]")) {
      expect(f).toHaveAttribute("aria-hidden", "true");
      expect(f.querySelector<HTMLElement>("[data-digital-card]")!.style.boxShadow).toBe("");
    }
    // Each list item is still named by its skin label.
    for (const label of ["Charcoal", "Scarlet", "Crimson", "Plan Blue"]) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });
});
