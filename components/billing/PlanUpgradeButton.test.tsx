import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanUpgradeButton } from "./PlanUpgradeButton";

describe("PlanUpgradeButton", () => {
  // The core requirement this component exists for: with no payment gateway
  // in the product, an "Upgrade" click must hand the user to a human rather
  // than start (or appear to start) a checkout that does not exist.
  test("clicking opens an inquiry dialog with a support contact", async () => {
    const user = userEvent.setup();
    render(<PlanUpgradeButton label="Upgrade to Pro" />);

    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(await screen.findByText(/handled personally for now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  test("the dialog stays closed until the button is clicked", () => {
    render(<PlanUpgradeButton label="Upgrade to Pro" />);

    expect(screen.queryByText(/handled personally for now/i)).not.toBeInTheDocument();
  });

  test("disabled prop prevents the dialog from opening at all", async () => {
    const user = userEvent.setup();
    render(<PlanUpgradeButton label="Upgrade to Pro" disabled />);

    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(screen.queryByText(/handled personally for now/i)).not.toBeInTheDocument();
  });
});
