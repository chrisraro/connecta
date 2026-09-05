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
    expect(screen.queryByRole("link", { name: /get pro/i })).not.toBeInTheDocument();
  });

  test("locked=true with children (overlay, the default) keeps the feature VISIBLE plus a lock badge and Get Pro CTA — nothing silently vanishes", () => {
    render(
      <UpgradeGate locked reason="This template is available on Pro & Business.">
        <button>Kinetic template</button>
      </UpgradeGate>,
    );
    // The feature itself is still visible, not hidden — only interaction is
    // blocked (this is the exact complaint the gating rework fixes: pro
    // features must not silently vanish for free users).
    expect(screen.getByText("Kinetic template")).toBeInTheDocument();
    expect(screen.getByText("This template is available on Pro & Business.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /get pro/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test("locked=true with no children (banner, the default) renders the reason and a Get Pro CTA with no feature preview", () => {
    render(<UpgradeGate locked reason="Upgrade to Pro to activate more than one card." />);
    expect(screen.getByText("Upgrade to Pro to activate more than one card.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /get pro/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test('variant="inline" renders a compact CTA carrying the reason as its accessible name, for tight toolbar slots', () => {
    render(<UpgradeGate locked reason="CSV export is a Pro feature." variant="inline" />);
    const cta = screen.getByRole("link", { name: /csv export is a pro feature.*get pro/i });
    expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test('variant="banner" explicitly set ignores any children and still shows the CTA', () => {
    render(
      <UpgradeGate locked reason="Team workspace is a Business feature." variant="banner">
        <button>Team roster</button>
      </UpgradeGate>,
    );
    expect(screen.queryByRole("button", { name: "Team roster" })).not.toBeInTheDocument();
    expect(screen.getByText("Team workspace is a Business feature.")).toBeInTheDocument();
  });
});
