import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpgradeGate } from "./UpgradeGate";

describe("UpgradeGate", () => {
  test("locked=false renders only the children — no lock badge, no CTA", () => {
    render(
      <UpgradeGate locked={false} reason="Unused when unlocked">
        <button>Kinetic template</button>
      </UpgradeGate>,
    );
    expect(screen.getByRole("button", { name: "Kinetic template" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /get lead tools/i })).not.toBeInTheDocument();
  });

  test("locked=true with children (overlay, the default) keeps the feature VISIBLE plus a lock badge and Get Lead tools CTA — nothing silently vanishes", () => {
    render(
      <UpgradeGate locked reason="This template is available on Lead tools & Teams.">
        <button>Kinetic template</button>
      </UpgradeGate>,
    );
    // The feature itself is still visible, not hidden — only interaction is
    // blocked (this is the exact complaint the gating rework fixes: paid
    // features must not silently vanish for free users).
    expect(screen.getByText("Kinetic template")).toBeInTheDocument();
    expect(screen.getByText("This template is available on Lead tools & Teams.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /get lead tools/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test("locked=true with no children (banner, the default) renders the reason and a Get Lead tools CTA with no feature preview", () => {
    render(<UpgradeGate locked reason="Upgrade to Lead tools to activate more than one card." />);
    expect(
      screen.getByText("Upgrade to Lead tools to activate more than one card."),
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /get lead tools/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test('variant="inline" renders a compact CTA carrying the reason as its accessible name, for tight toolbar slots', () => {
    render(<UpgradeGate locked reason="CSV export is a Lead tools feature." variant="inline" />);
    const cta = screen.getByRole("link", { name: /csv export is a lead tools feature.*get lead tools/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test('variant="banner" explicitly set ignores any children and still shows the CTA', () => {
    render(
      <UpgradeGate locked reason="Team workspace is a Teams feature." variant="banner">
        <button>Team roster</button>
      </UpgradeGate>,
    );
    expect(screen.queryByRole("button", { name: "Team roster" })).not.toBeInTheDocument();
    expect(screen.getByText("Team workspace is a Teams feature.")).toBeInTheDocument();
  });
});
