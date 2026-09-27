import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberView, type MemberViewMember, type MemberViewTeam } from "./page";

// Pure presentational component -- plain props in, JSX out, no hooks of its
// own -- so this mounts it directly with no mocking, the way
// components/billing/UpgradeGate.test.tsx does for its subject.

const team: MemberViewTeam = {
  id: "team1",
  name: "Santos Realty",
  companyName: "Santos Realty Corp.",
  ownerId: "owner1",
};

const members: MemberViewMember[] = [
  { userId: "owner1", name: "Maria Santos", email: "maria@example.com", role: "owner" },
  { userId: "member1", name: "Juan Dela Cruz", email: "juan@example.com", role: "member" },
];

describe("MemberView", () => {
  test("shows the team's company name and the owner", () => {
    render(<MemberView team={team} members={members} busy={false} onLeave={() => {}} />);
    expect(screen.getByText("Santos Realty Corp.")).toBeInTheDocument();
    // Appears twice: the "Owner" summary field, and once more in the roster.
    expect(screen.getAllByText("Maria Santos")).toHaveLength(2);
  });

  test("falls back to the team's name when there is no company name", () => {
    render(
      <MemberView
        team={{ ...team, companyName: null }}
        members={members}
        busy={false}
        onLeave={() => {}}
      />,
    );
    expect(screen.getByText("Santos Realty")).toBeInTheDocument();
  });

  test("lists every member, marking the owner", () => {
    render(<MemberView team={team} members={members} busy={false} onLeave={() => {}} />);
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getAllByText("Owner")).toHaveLength(2); // the "Owner" field value and the roster badge
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  test("renders no remove/invite/branding controls -- this is the read-only member view", () => {
    render(<MemberView team={team} members={members} busy={false} onLeave={() => {}} />);
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
  });

  test("Leave team calls onLeave", async () => {
    const onLeave = vi.fn();
    const user = userEvent.setup();
    render(<MemberView team={team} members={members} busy={false} onLeave={onLeave} />);

    await user.click(screen.getByRole("button", { name: /leave team/i }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  test("busy disables the Leave team button", () => {
    render(<MemberView team={team} members={members} busy={true} onLeave={() => {}} />);
    expect(screen.getByRole("button", { name: /leave team/i })).toBeDisabled();
  });
});
