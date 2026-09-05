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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
    );
    expect(screen.getByText("No jobs yet.")).toBeInTheDocument();
  });
});
