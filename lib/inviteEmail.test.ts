import { describe, expect, it } from "vitest";
import { cleanInviteField, inviteEmailData } from "./inviteEmail";

describe("cleanInviteField", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanInviteField("  Acme   Realty \n")).toBe("Acme Realty");
  });

  it("strips angle brackets and control characters", () => {
    expect(cleanInviteField("<b>Acme</b>\u0007")).toBe("b Acme /b");
  });

  it("caps long values with an ellipsis", () => {
    const out = cleanInviteField("x".repeat(200));
    expect(out.length).toBe(60);
    expect(out.endsWith("…")).toBe(true);
  });

  it("treats null and undefined as empty", () => {
    expect(cleanInviteField(null)).toBe("");
    expect(cleanInviteField(undefined)).toBe("");
  });
});

describe("inviteEmailData", () => {
  it("prefers the company name over the team name", () => {
    expect(
      inviteEmailData({ inviterName: "Ana Cruz", teamName: "Sales", companyName: "Acme Realty" }),
    ).toEqual({ inviter_name: "Ana Cruz", team_name: "Acme Realty" });
  });

  it("falls back to the inviter's email, then a neutral phrase", () => {
    expect(
      inviteEmailData({ inviterName: " ", inviterEmail: "ana@acme.ph", teamName: "Sales" }),
    ).toEqual({
      inviter_name: "ana@acme.ph",
      team_name: "Sales",
    });
    expect(inviteEmailData({})).toEqual({ inviter_name: "A teammate", team_name: "their team" });
  });

  it("never uses the keys handle_new_user copies into public.users.name", () => {
    const data = inviteEmailData({ inviterName: "Ana" });
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("full_name");
  });
});
