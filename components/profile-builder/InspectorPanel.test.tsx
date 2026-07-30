import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InspectorPanel } from "./InspectorPanel";

describe("InspectorPanel", () => {
  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView at all.
    Element.prototype.scrollIntoView = vi.fn();
  });

  test("renders nothing when closed", () => {
    const { container } = render(
      <InspectorPanel isOpen={false} title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("does not cover the whole viewport — it must not be a fullscreen overlay", () => {
    render(
      <InspectorPanel isOpen title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );
    const panel = screen.getByRole("dialog");
    // The old SectionEditor used `fixed inset-0`, which is exactly what hid the
    // preview. Guard against a regression to that.
    expect(panel.className).not.toMatch(/\binset-0\b/);
  });

  test("is a labelled dialog", () => {
    render(
      <InspectorPanel isOpen title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );
    expect(screen.getByRole("dialog", { name: "Experience" })).toBeInTheDocument();
  });

  test("close button has an accessible name and fires onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <InspectorPanel isOpen title="Experience" onClose={onClose}>
        <p>body</p>
      </InspectorPanel>
    );
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape closes the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <InspectorPanel isOpen title="Experience" onClose={onClose}>
        <p>body</p>
      </InspectorPanel>
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders its children", () => {
    render(
      <InspectorPanel isOpen title="Experience" onClose={() => {}}>
        <p>the editor body</p>
      </InspectorPanel>
    );
    expect(screen.getByText("the editor body")).toBeInTheDocument();
  });

  test("scrolls itself into view when it opens, so the panel you just opened isn't below the fold", () => {
    const { rerender } = render(
      <InspectorPanel isOpen={false} title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <InspectorPanel isOpen title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "nearest" })
    );
  });

  test("respects prefers-reduced-motion when scrolling itself into view", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);

    render(
      <InspectorPanel isOpen title="Experience" onClose={() => {}}>
        <p>body</p>
      </InspectorPanel>
    );

    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "auto" })
    );

    vi.unstubAllGlobals();
  });
});
