import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanPanel } from "./PlanPanel";

describe("PlanPanel", () => {
  test("is a region named by its heading, which sits on the boundary line", () => {
    render(
      <PlanPanel heading="Create your account">
        <p>Form</p>
      </PlanPanel>,
    );
    const region = screen.getByRole("region", { name: "Create your account" });
    expect(region).toContainElement(screen.getByText("Form"));
    expect(screen.getByRole("heading", { name: "Create your account", level: 2 })).toBeInTheDocument();
  });

  test("renders a heading at the requested level", () => {
    render(
      <PlanPanel heading="Leads" level={1}>
        <p>List</p>
      </PlanPanel>,
    );
    expect(screen.getByRole("heading", { name: "Leads", level: 1 })).toBeInTheDocument();
  });

  test("without a heading it is a plain boundary, not a named region", () => {
    render(
      <PlanPanel>
        <p>Body</p>
      </PlanPanel>,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
