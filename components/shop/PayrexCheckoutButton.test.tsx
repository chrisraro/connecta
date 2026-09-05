import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayrexCheckoutButton } from "./PayrexCheckoutButton";

describe("PayrexCheckoutButton", () => {
  test("paymentsEnabled=true calls onCheckout directly and never shows the placeholder dialog", async () => {
    const user = userEvent.setup();
    const onCheckout = vi.fn();
    render(
      <PayrexCheckoutButton
        paymentsEnabled
        onCheckout={onCheckout}
        totalLabel="Pay ₱500.00 with PayRex"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Pay ₱500.00 with PayRex/ }));

    expect(onCheckout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/finalizing our payment provider/i)).not.toBeInTheDocument();
  });

  // The core requirement this component exists for: the shop checkout must
  // STOP calling createOrder + the dead PayRex createCheckoutSession action
  // (convex/payrex.ts throws — PAYREX_SECRET_KEY unset). createOrder is also
  // what clears the cart server-side, so never calling onCheckout while
  // disabled is exactly what keeps the cart intact — there is no separate
  // "clear cart" call in this component to assert against.
  test("paymentsEnabled=false never calls onCheckout — it opens a placeholder dialog with a support contact instead, leaving the cart untouched", async () => {
    const user = userEvent.setup();
    const onCheckout = vi.fn();
    render(
      <PayrexCheckoutButton
        paymentsEnabled={false}
        onCheckout={onCheckout}
        totalLabel="Pay ₱500.00 with PayRex"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Pay ₱500.00 with PayRex/ }));

    expect(onCheckout).not.toHaveBeenCalled();
    expect(await screen.findByText(/finalizing our payment provider/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  test("disabled prop prevents the click handler from firing at all", async () => {
    const user = userEvent.setup();
    const onCheckout = vi.fn();
    render(
      <PayrexCheckoutButton
        paymentsEnabled
        onCheckout={onCheckout}
        totalLabel="Pay ₱500.00 with PayRex"
        disabled
      />,
    );

    await user.click(screen.getByRole("button", { name: /Pay ₱500.00 with PayRex/ }));
    expect(onCheckout).not.toHaveBeenCalled();
  });

  test("busy state shows the busy label instead of the total label", () => {
    render(
      <PayrexCheckoutButton
        paymentsEnabled
        onCheckout={vi.fn()}
        totalLabel="Pay ₱500.00 with PayRex"
        busyLabel="Redirecting to PayRex..."
        busy
      />,
    );

    expect(screen.getByRole("button", { name: /Redirecting to PayRex/ })).toBeDisabled();
    expect(screen.queryByText("Pay ₱500.00 with PayRex")).not.toBeInTheDocument();
  });
});
