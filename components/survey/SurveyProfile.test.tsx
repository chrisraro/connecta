import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurveyProfile } from "./SurveyProfile";
import { PROFILE_COPY } from "./copy";
import { buildDemoProfile } from "@/components/marketing/demoProfile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderProfile() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SurveyProfile data={buildDemoProfile("editorial")} t={PROFILE_COPY} />
    </QueryClientProvider>,
  );
}

// 2026-10-01 bug: the lead form renders twice (left column on desktop, in
// the flow on phones; CSS hides one). Both sections carried
// id="leave-details", so on phones "Send my details" jumped to the hidden
// copy and the page did not move.
describe("SurveyProfile lead form", () => {
  test("no element id appears twice", () => {
    const { container } = renderProfile();
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  test("Send my details scrolls to the visible lead form and focuses its first field", async () => {
    renderProfile();
    const anchors = [...document.querySelectorAll<HTMLElement>("[data-lead-anchor]")];
    expect(anchors).toHaveLength(2);
    // jsdom lays nothing out: make only the second (the phone placement) visible.
    const visible = anchors[1];
    for (const a of anchors) {
      a.getClientRects = () => (a === visible ? ([{}] as unknown as DOMRectList) : ([] as unknown as DOMRectList));
      a.scrollIntoView = vi.fn();
    }
    await userEvent.click(screen.getByRole("link", { name: PROFILE_COPY.sendDetails }));
    expect(visible.scrollIntoView).toHaveBeenCalled();
    expect(anchors[0].scrollIntoView).not.toHaveBeenCalled();
    expect(visible.contains(document.activeElement)).toBe(true);
  });
});
