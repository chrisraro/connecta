# Builder Rebuild — Editable Entries & Docked Inspector

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two structural defects in the profile builder: (1) added entries are read-only text with a delete button, so correcting a typo means deleting and retyping every field; (2) all 12 editors are `fixed inset-0` fullscreen overlays, so opening any editor hides the live preview — making it impossible to see a change land while making it.

**Architecture:** One reusable `<EditableList>` primitive replaces eight hand-written read-only list blocks (~120 lines of near-identical JSX). `SectionEditor` stops being a fullscreen overlay and becomes a docked inspector — a right-hand panel at `lg:` and above, a half-height bottom sheet below it — inside a new two-column builder layout where the preview column is sticky and always visible.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Radix, Vitest + @testing-library/react (jsdom via the `*.test.tsx` project in `vitest.config.ts`).

## Global Constraints

- Branch: `redesign/product-ux` (already checked out). Never commit to `main`.
- **Do not break dirty-tracking.** `savedSnapshotRef` (L502), `captureSnapshot` (L428–437), `isDirty` (L439–450), the mount-baseline effect (L516–521), the prefill recapture effect (L629–633), the `beforeunload` effect (L452–460), the back-button confirm (L923–933), and the post-save capture (L804) must all keep working. Editing an entry in place MUST mark the form dirty.
- **Do not break section reorder or hide/show.** `componentOrder` behaviour is covered by `lib/profileSections.test.ts` — that file must stay green and untouched.
- **Mobile-first.** `PRODUCT.md` puts mobile first; the builder is currently `max-w-lg mx-auto` with zero breakpoint classes. New layout must work at 390px before it works at 1440px.
- Radius: only `var(--r-sm|md|lg)` or `rounded-full`. **No new arbitrary `rounded-[Npx]`.** (The existing phone bezel `rounded-[2.5rem]`/`rounded-[2rem]` is pre-existing; Task 2 replaces it.)
- Elevation: only `var(--e-raised)` / `var(--e-overlay)`. No `shadow-2xl`.
- Every icon-only button needs an `aria-label`. Touch targets ≥44px in the builder (an audit found 16px drag handles and 24px delete buttons).
- Every animation needs a `prefers-reduced-motion` alternative.
- Commit with `feat(builder):` or `refactor(builder):` prefix.

---

## Task 1: `<EditableList>` primitive, and migrate all eight lists to it

**Files:**
- Create: `components/profile-builder/EditableList.tsx`
- Create: `components/profile-builder/EditableList.test.tsx`
- Modify: `app/dashboard/builder/page.tsx`

**Interfaces:**
- Produces: `<EditableList<T> items fields onChange onAdd? addLabel? emptyHint? itemLabel />` — renders each existing item as a row of **editable inputs** plus a 44px delete button, and (optionally) a draft row for adding a new one.
- `FieldDef<T>` = `{ key: keyof T & string; label: string; placeholder?: string; type?: "text" | "textarea" | "url" | "number"; required?: boolean; width?: "full" | "half" }`.
- Consumed by: the Education, TechStack, Experience, Testimonials, Products, PropertyListings, and InlineProjects editors in `builder/page.tsx`. (Gallery is image-based and keeps `GalleryUploader`.)

**Why a primitive rather than editing eight blocks in place:** the eight blocks are the same JSX with different field names — exactly the copy-paste pattern this project has been removing everywhere else. Fixing them individually would leave eight places for the next bug to hide.

- [ ] **Step 1: Write the failing test**

Create `components/profile-builder/EditableList.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableList } from "./EditableList";

type Job = { title: string; company: string };

const FIELDS = [
  { key: "title" as const, label: "Job title" },
  { key: "company" as const, label: "Company" },
];

describe("EditableList", () => {
  test("renders each existing item as editable inputs, not static text", () => {
    render(
      <EditableList<Job>
        items={[{ title: "Developer", company: "Acme" }]}
        fields={FIELDS}
        onChange={() => {}}
        itemLabel="job"
      />
    );
    // The value must live in a real form control the user can focus and type into.
    const input = screen.getByDisplayValue("Developer");
    expect(input.tagName).toMatch(/INPUT|TEXTAREA/);
    expect(input).not.toHaveAttribute("readonly");
    expect(input).not.toBeDisabled();
  });

  test("editing a field emits the full updated list with only that field changed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableList<Job>
        items={[
          { title: "Developer", company: "Acme" },
          { title: "Designer", company: "Beta" },
        ]}
        fields={FIELDS}
        onChange={onChange}
        itemLabel="job"
      />
    );

    await user.type(screen.getByDisplayValue("Developer"), "!");

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)![0] as Job[];
    expect(next).toHaveLength(2);
    expect(next[0].title).toBe("Developer!");
    expect(next[0].company).toBe("Acme");
    // The untouched sibling must be preserved exactly.
    expect(next[1]).toEqual({ title: "Designer", company: "Beta" });
  });

  test("deleting removes only the targeted row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableList<Job>
        items={[
          { title: "Developer", company: "Acme" },
          { title: "Designer", company: "Beta" },
        ]}
        fields={FIELDS}
        onChange={onChange}
        itemLabel="job"
      />
    );

    await user.click(screen.getAllByRole("button", { name: /remove job 1/i })[0]);

    expect(onChange).toHaveBeenCalledWith([{ title: "Designer", company: "Beta" }]);
  });

  test("every delete control has an accessible name", () => {
    render(
      <EditableList<Job>
        items={[{ title: "Developer", company: "Acme" }]}
        fields={FIELDS}
        onChange={() => {}}
        itemLabel="job"
      />
    );
    const btn = screen.getByRole("button", { name: /remove job 1/i });
    expect(btn).toBeInTheDocument();
  });

  test("shows the empty hint when there are no items", () => {
    render(
      <EditableList<Job>
        items={[]}
        fields={FIELDS}
        onChange={() => {}}
        itemLabel="job"
        emptyHint="No jobs yet."
      />
    );
    expect(screen.getByText("No jobs yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/profile-builder/EditableList.test.tsx`
Expected: FAIL — `./EditableList` does not exist.

- [ ] **Step 3: Implement `components/profile-builder/EditableList.tsx`**

Requirements the tests pin down, plus the constraints:

- Each item renders one input per field, `value` bound to the item, `onChange` emitting a new array with that one item's one field replaced (never mutate).
- Each row has a delete button with `aria-label={`Remove ${itemLabel} ${index + 1}`}`, sized ≥44×44 (`size-11` or `h-11 w-11`).
- `type: "textarea"` renders a `<textarea>`; `"url"`/`"number"` set the matching `type` on `<input>`.
- Labels are associated with inputs via `htmlFor`/`id` (use `useId()` for uniqueness across multiple lists on one page).
- Radii from `var(--r-sm)` / `var(--r-md)`; no arbitrary values.
- When `items` is empty and `emptyHint` is given, render the hint.
- When `onAdd` is provided, render a draft row plus an "Add" button that calls `onAdd()` — the parent keeps owning draft state, so existing `newEducation`/`addEducation` handlers keep working unchanged.
- `"use client"` at the top.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/profile-builder/EditableList.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Migrate the seven text lists in `app/dashboard/builder/page.tsx`**

Replace the read-only rendered block in each editor with an `<EditableList>`. Current line ranges (verify by content — they shift as you edit):

| List | Read-only block | State setter | Keep the existing add-handler |
|---|---|---|---|
| education | 1637–1648 | `setEducation` | `addEducation` (L815) |
| techStack | 1664–1674 | `setTechStack` | `addTechStack` (L821) |
| experience | 1689–1701 | `setExperience` | `addExperience` (L830) |
| inlineProjects | 1724–1736 | `setInlineProjects` | `addInlineProject` (L866) |
| products | 1769–1781 | `setProducts` | `addProduct` (L842) |
| propertyListings | 1805–1821 | `setPropertyListings` | `addPropertyListing` (L853) |
| testimonials | 1854–1865 | `setTestimonials` | `addTestimonial` (L836) |

Field definitions must match each type's real shape — read `types/profile.ts` for `ProfileInfo["education"]`, `["techStack"]`, `["experience"]`, `["testimonials"]`, and `ProductItem` / `PropertyListingItem` / `InlineProject`. Note `techStack` items hold `skills: string[]`; render that as a comma-separated text field and split on change (mirroring how `addTechStack` already parses it).

**Do not touch** `GalleryUploader` (image-based, already has working thumbnails + delete) or the Certification editor (a single object, not a list).

- [ ] **Step 6: Verify dirty-tracking still fires on an in-place edit**

Editing an existing entry changes `education`/`experience`/etc., which are already inside `captureSnapshot`'s serialized set (L428–437), so `isDirty()` should return true. Confirm by reading those lines — if any migrated array is missing from the snapshot payload, add it.

- [ ] **Step 7: Run the full suite and build**

Run: `npx vitest run && npm run build`
Expected: both pass; suite gains 5 tests. `lib/profileSections.test.ts` must still pass untouched.

- [ ] **Step 8: Manual verification**

Run `npm run dev`. Open the builder, add an Experience entry, then **edit its job title in place** and confirm: the text changes, the live preview updates, and pressing back now warns about unsaved changes. Repeat for one more list (Products). Confirm delete still removes the right row. Stop the dev server. Report exactly what you observed.

- [ ] **Step 9: Commit**

```bash
git add components/profile-builder/EditableList.tsx components/profile-builder/EditableList.test.tsx app/dashboard/builder/page.tsx
git commit -m "feat(builder): editable entries via one EditableList primitive, replacing 7 read-only blocks"
```

---

## Task 2: Docked inspector — stop hiding the preview

**Files:**
- Modify: `app/dashboard/builder/page.tsx`
- Create: `components/profile-builder/InspectorPanel.tsx`
- Create: `components/profile-builder/InspectorPanel.test.tsx`

**Interfaces:**
- Produces: `<InspectorPanel isOpen title onClose onSave? children />` — replaces `SectionEditor` (currently L326–361). Renders as a right-docked panel from `lg:` up and a bottom sheet below `lg:`, never covering the preview column on desktop.
- The 12 call sites keep their existing shape (`isOpen={activeModal === "X"}`, `onClose={() => setActiveModal(null)}`), so this is a drop-in replacement — only the component's own rendering changes.

**The defect being fixed:** `SectionEditor` is `fixed inset-0 z-[60] bg-background` (L342). It covers the entire viewport, so the preview is gone the moment you open any editor.

- [ ] **Step 1: Write the failing test**

Create `components/profile-builder/InspectorPanel.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InspectorPanel } from "./InspectorPanel";

describe("InspectorPanel", () => {
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/profile-builder/InspectorPanel.test.tsx`
Expected: FAIL — `./InspectorPanel` does not exist.

- [ ] **Step 3: Implement `components/profile-builder/InspectorPanel.tsx`**

- `role="dialog"`, `aria-label={title}`, `aria-modal` **not** set on desktop (it is genuinely non-modal there — the preview stays interactive).
- Mobile (`< lg`): bottom sheet — `fixed inset-x-0 bottom-0 max-h-[70dvh]` with `rounded-t-[var(--r-lg)]`, `var(--e-overlay)`, and a scrollable body. **`dvh`, not `vh`** (iOS Safari).
- Desktop (`lg:`): docked right column — `lg:static lg:max-h-none lg:rounded-[var(--r-md)] lg:shadow-none lg:border`, filling its grid cell rather than floating.
- Escape closes (`keydown` listener with cleanup).
- Close button: ≥44px, `aria-label="Close"`.
- Entrance animation gated behind `motion-safe:`; no animation under `prefers-reduced-motion`.
- Header shows `title` and, when `onSave` is provided, a Done/Save action — preserving the current `SectionEditor`'s optional `onSave` behaviour.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/profile-builder/InspectorPanel.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 5: Restructure the builder into two columns**

In `app/dashboard/builder/page.tsx`:

- The main content wrapper is currently `max-w-lg mx-auto` (L922, L948) with **zero breakpoint classes**. Change to a responsive shell: single column below `lg`, and at `lg:` a two-column grid — preview column (sticky) + controls column. Suggested: `mx-auto w-full max-w-lg lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8 lg:items-start`.
- Make the preview column `lg:sticky lg:top-6` so it stays in view while the controls scroll.
- **Remove the `maxHeight: "520px"` scroll jail** (L978–981). On mobile keep a sensible capped height; on `lg:` let the preview take its natural height inside the sticky column. Keep `overflow-y-auto` only where a cap actually applies.
- Replace the phone bezel's arbitrary radii (`rounded-[2.5rem]`/`rounded-[2rem]`, L977–978) with `var(--r-lg)`, and `shadow-2xl` with `var(--e-overlay)` per the global constraints.
- Render `<InspectorPanel>` inside the controls column at `lg:` so it docks beside the preview rather than over it.

- [ ] **Step 6: Swap `SectionEditor` → `InspectorPanel` at all 12 call sites**

Lines 1343, 1526, 1544, 1605, 1631, 1658, 1683, 1718, 1763, 1799, 1848, 1881. Props are identical, so this is a mechanical rename. Then **delete the now-unused `SectionEditor` component** (L326–361).

Also fix the dead "Contact" case: L1078 does `setActiveModal(block.id)` for every block, but no editor matches `activeModal === "Contact"`, so clicking Edit on Contact opens nothing. Either add a Contact editor or don't render an Edit affordance for it — pick one and say which.

- [ ] **Step 7: Fix the touch targets flagged by the audit**

While in this file: the drag handle (an unpadded 16×16 `GripVertical`) and the gallery remove button (24×24) are both under the 44px minimum this plan requires. Pad both to ≥44px and give every icon-only button in the file an `aria-label` — an audit found **zero** `aria-*` attributes in this 1,900-line file.

- [ ] **Step 8: Run the full suite and build**

Run: `npx vitest run && npm run build`
Expected: both pass. `lib/profileSections.test.ts` still green and untouched.

- [ ] **Step 9: Manual verification — the whole point of the task**

Run `npm run dev`. At a desktop width (≥1280px):
1. Open the Experience editor. **The live preview must remain visible** beside it — this is the defect being fixed.
2. Edit a field and watch the preview update **without closing the editor**.
3. Confirm Escape and the Close button both dismiss it.

Then at 390px width (device toolbar):
4. Confirm the editor is a bottom sheet, the preview is above it, and nothing is clipped or horizontally scrolling.
5. Confirm reorder and hide/show still work end to end (drag a section, toggle one off, Save, view the public profile).

Report measured evidence, not impressions — for step 1, confirm the preview element still has a non-zero bounding box while the inspector is open. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add components/profile-builder/InspectorPanel.tsx components/profile-builder/InspectorPanel.test.tsx app/dashboard/builder/page.tsx
git commit -m "feat(builder): docked inspector keeps the live preview visible while editing"
```

---

## Deferred (not in this plan)

- Direct manipulation (click-to-edit on the canvas itself). Explicitly deprioritised in favour of the lower-risk inspector.
- Contrast warnings on the five disconnected colour pickers (`meetsAA` from `lib/brand.ts` already exists to power this).
- Decomposing `BuilderContent` (still ~1,500 lines in one function) into per-section editor components.
- Replacing the 30 `useState` calls with react-hook-form + zod — both are already installed and unused.
