import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanUpgradeButton } from "./PlanUpgradeButton";

describe("PlanUpgradeButton", () => {
  test("paymentsEnabled=true calls onUpgrade directly and never shows the placeholder dialog", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(
      <PlanUpgradeButton label="Upgrade to Pro" paymentsEnabled onUpgrade={onUpgrade} />
    );

    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(/finalizing our payment provider/i)
    ).not.toBeInTheDocument();
  });

  // The core requirement this component exists for: the billing page must
  // STOP calling the dead PayRex checkout (convex/billing.ts throws — keys
  // unset). While PAYMENTS_ENABLED is false, clicking must never invoke the
  // real checkout action; it opens a polite placeholder instead.
  test("paymentsEnabled=false never calls onUpgrade — it opens a placeholder dialog with a support contact instead", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(
      <PlanUpgradeButton label="Upgrade to Pro" paymentsEnabled={false} onUpgrade={onUpgrade} />
    );

    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(onUpgrade).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/finalizing our payment provider/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:")
    );
  });

  test("disabled prop prevents the click handler from firing at all", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(
      <PlanUpgradeButton
        label="Upgrade to Pro"
        paymentsEnabled
        onUpgrade={onUpgrade}
        disabled
      />
    );

    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));
    expect(onUpgrade).not.toHaveBeenCalled();
  });
});
