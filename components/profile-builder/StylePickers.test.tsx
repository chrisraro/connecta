import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardSkinPicker, SheetPicker } from "./StylePickers";
import { PLAN_LIMITS } from "@/lib/plans";

// One picker for the builder and onboarding (2026-10-01).
const free = PLAN_LIMITS.free;

describe("SheetPicker", () => {
  test("lists free styles first and tags the paid one", () => {
    render(<SheetPicker selected="editorial" allowedTemplateIds={free.allowedTemplateIds} onSelect={() => {}} />);
    const tiles = screen.getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual(["Whiteprint", "Graphite", "BlueprintLead tools"]);
    expect(tiles[0]).toHaveAttribute("aria-pressed", "true");
    expect(tiles[2]).toBeDisabled();
  });

  test("a locked style cannot be chosen", async () => {
    const onSelect = vi.fn();
    render(<SheetPicker selected="editorial" allowedTemplateIds={free.allowedTemplateIds} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Blueprint/ }));
    await userEvent.click(screen.getByRole("button", { name: /Graphite/ }));
    expect(onSelect.mock.calls).toEqual([["architectural"]]);
  });

  test("onboarding has no upgrade link; the builder does", () => {
    const { unmount } = render(
      <SheetPicker selected="editorial" allowedTemplateIds={free.allowedTemplateIds} onSelect={() => {}} />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    unmount();
    render(<SheetPicker selected="editorial" allowedTemplateIds={free.allowedTemplateIds} onSelect={() => {}} upgradeCta />);
    expect(screen.getByRole("link", { name: /Get Lead tools/ })).toBeInTheDocument();
  });
});

describe("CardSkinPicker", () => {
  test("free skin first, the rest tagged Lead tools", () => {
    render(<CardSkinPicker selected="charcoal" allowedSkins={free.allowedCardSkins} onSelect={() => {}} />);
    const tiles = screen.getAllByRole("button");
    expect(tiles[0]).toHaveTextContent("Charcoal");
    expect(tiles[0]).not.toHaveTextContent("Lead tools");
    for (const t of tiles.slice(1)) expect(t).toHaveTextContent("Lead tools");
  });

  test("a paid plan unlocks every skin", () => {
    render(<CardSkinPicker selected="charcoal" allowedSkins={null} onSelect={() => {}} />);
    for (const t of screen.getAllByRole("button")) expect(t).toBeEnabled();
  });
});
