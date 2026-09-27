import { describe, expect, test } from "vitest";
import { CONNECTA } from "./brand";
import {
  canInviteMore,
  canLeaveTeam,
  inviteBannerText,
  seatUsagePercent,
  seatsRemaining,
  teamGateFor,
} from "./team";

describe("seatUsagePercent", () => {
  test("clamps to 0-100 and never divides by zero", () => {
    expect(seatUsagePercent({ used: 0, total: 0 })).toBe(0);
    expect(seatUsagePercent({ used: 2, total: 5 })).toBe(40);
    expect(seatUsagePercent({ used: 5, total: 5 })).toBe(100);
    // Over capacity (a seat count reduced after invites went out) still
    // renders as a full bar, not a bar wider than its own track.
    expect(seatUsagePercent({ used: 7, total: 5 })).toBe(100);
  });
});

describe("seatsRemaining", () => {
  test("never goes negative", () => {
    expect(seatsRemaining({ used: 2, total: 5 })).toBe(3);
    expect(seatsRemaining({ used: 5, total: 5 })).toBe(0);
    expect(seatsRemaining({ used: 7, total: 5 })).toBe(0);
  });
});

describe("canInviteMore", () => {
  test("true only while a seat is free", () => {
    expect(canInviteMore({ used: 4, total: 5 })).toBe(true);
    expect(canInviteMore({ used: 5, total: 5 })).toBe(false);
    expect(canInviteMore({ used: 0, total: 0 })).toBe(false);
  });
});

describe("teamGateFor", () => {
  test("undefined data is still loading", () => {
    expect(teamGateFor(undefined)).toBe("loading");
  });

  test("null data (signed out, or the RPC found nothing) is the upgrade gate", () => {
    expect(teamGateFor(null)).toBe("upgrade");
  });

  test("a free-plan caller with no team sees the upgrade gate", () => {
    expect(teamGateFor({ plan: "free", team: null })).toBe("upgrade");
  });

  test("lead_tools is not teams -- still the upgrade gate, even with a team row somehow present", () => {
    expect(teamGateFor({ plan: "lead_tools", team: {} })).toBe("upgrade");
  });

  test("teams plan with no team row (edge case: inherited plan lost its team) is still the upgrade gate", () => {
    expect(teamGateFor({ plan: "teams", team: null })).toBe("upgrade");
  });

  test("teams plan with a team is the active view", () => {
    expect(teamGateFor({ plan: "teams", team: { id: "t1" } })).toBe("active");
  });
});

describe("canLeaveTeam", () => {
  test("a member can leave; the owner cannot (no disband flow exists)", () => {
    expect(canLeaveTeam(false)).toBe(true);
    expect(canLeaveTeam(true)).toBe(false);
  });
});

describe("inviteBannerText", () => {
  test("names the owner and the team", () => {
    expect(inviteBannerText({ ownerName: "Maria Santos", teamName: "Santos Realty" })).toBe(
      `Maria Santos invited you to join Santos Realty on ${CONNECTA.name}`,
    );
  });
});
