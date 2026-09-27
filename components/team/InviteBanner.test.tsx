import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CONNECTA } from "@/lib/brand";

// hooks/useTeam pulls in @tanstack/react-query, @/lib/db/client (a real
// Supabase browser client) and @/components/auth/AuthProvider -- none of
// which this component test needs, since InviteBanner only ever calls the
// three hooks it imports. Mocking the module keeps the test to "does this
// component render the right thing for what the hooks return", the same
// boundary components/billing/UpgradeGate.test.tsx and
// app/dashboard/onboarding/page.test.tsx draw around their own dependencies.
const { acceptInvite, declineInvite, invites } = vi.hoisted(() => ({
  acceptInvite: vi.fn(async () => {}),
  declineInvite: vi.fn(async () => {}),
  invites: { current: [] as { id: string; teamId: string; teamName: string; ownerName: string | null; invitedAt: string }[] },
}));

vi.mock("@/hooks/useTeam", () => ({
  useMyInvites: () => ({ data: invites.current }),
  useAcceptInvite: () => ({ mutateAsync: acceptInvite }),
  useDeclineInvite: () => ({ mutateAsync: declineInvite }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

import { InviteBanner } from "./InviteBanner";

describe("InviteBanner", () => {
  beforeEach(() => {
    invites.current = [];
    acceptInvite.mockClear();
    declineInvite.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  test("renders nothing when there are no pending invites", () => {
    const { container } = render(<InviteBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  test("names the owner and the team, and offers Accept / Decline", () => {
    invites.current = [
      { id: "inv1", teamId: "t1", teamName: "Santos Realty", ownerName: "Maria Santos", invitedAt: "2026-09-27T00:00:00Z" },
    ];
    render(<InviteBanner />);
    expect(
      screen.getByText(`Maria Santos invited you to join Santos Realty on ${CONNECTA.name}`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  test("Accept calls useAcceptInvite with the invite id", async () => {
    invites.current = [
      { id: "inv1", teamId: "t1", teamName: "Santos Realty", ownerName: "Maria Santos", invitedAt: "2026-09-27T00:00:00Z" },
    ];
    const user = userEvent.setup();
    render(<InviteBanner />);

    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(acceptInvite).toHaveBeenCalledWith("inv1");
    expect(declineInvite).not.toHaveBeenCalled();
  });

  test("Decline calls useDeclineInvite with the invite id, not accept", async () => {
    invites.current = [
      { id: "inv1", teamId: "t1", teamName: "Santos Realty", ownerName: "Maria Santos", invitedAt: "2026-09-27T00:00:00Z" },
    ];
    const user = userEvent.setup();
    render(<InviteBanner />);

    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(declineInvite).toHaveBeenCalledWith("inv1");
    expect(acceptInvite).not.toHaveBeenCalled();
  });

  test("a missing owner name falls back to 'Someone' rather than rendering blank", () => {
    invites.current = [
      { id: "inv1", teamId: "t1", teamName: "Santos Realty", ownerName: null, invitedAt: "2026-09-27T00:00:00Z" },
    ];
    render(<InviteBanner />);
    expect(
      screen.getByText(`Someone invited you to join Santos Realty on ${CONNECTA.name}`),
    ).toBeInTheDocument();
  });

  test("renders one row per pending invite", () => {
    invites.current = [
      { id: "inv1", teamId: "t1", teamName: "Santos Realty", ownerName: "Maria Santos", invitedAt: "2026-09-27T00:00:00Z" },
      { id: "inv2", teamId: "t2", teamName: "Cruz Homes", ownerName: "Juan Cruz", invitedAt: "2026-09-27T00:00:00Z" },
    ];
    render(<InviteBanner />);
    expect(screen.getAllByRole("button", { name: "Accept" })).toHaveLength(2);
  });
});
