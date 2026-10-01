import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Roadmap } from "./Roadmap";
import { LANDING_COPY } from "./copy";
import { NAV_LINKS } from "@/components/marketing/siteLayout";

// The owner's roadmap (2026-10-01): shown as planned, never as available.
describe("Roadmap", () => {
  test("is an anchored section with the three groups", () => {
    const { container } = render(<Roadmap t={LANDING_COPY} />);
    expect(container.querySelector("section#roadmap")).not.toBeNull();
    for (const g of ["Design & Customization", "Platform & Automations", "NFC Hardware Expansion"]) {
      expect(screen.getByRole("heading", { level: 3, name: g })).toBeInTheDocument();
    }
  });

  test("lists all six items, each tagged Planned", () => {
    render(<Roadmap t={LANDING_COPY} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading", { level: 4 }).textContent)).toEqual([
      "Digital profile & card templates",
      "Marketing & CRM integrations",
      "Event management suite",
      "Review tap standees",
      "Traffic & storefront standees",
      "Event access standees",
    ]);
    for (const li of items) expect(li).toHaveTextContent("Planned");
  });

  test("says plainly that none of it is available yet", () => {
    render(<Roadmap t={LANDING_COPY} />);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });

  // Owner decision 2026-10-01: no tier on the Event suite until it is priced.
  test("the event suite names no plan or tier", () => {
    render(<Roadmap t={LANDING_COPY} />);
    const item = screen.getByRole("heading", { level: 4, name: "Event management suite" }).closest("li")!;
    expect(item.textContent).not.toMatch(/\b(pro|free|lead tools|teams?|tier)\b/i);
  });

  test("the site header links to it", () => {
    expect(NAV_LINKS.map((l) => l.href)).toContain("/#roadmap");
  });
});
