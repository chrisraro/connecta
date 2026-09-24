import { expect, test } from "vitest";
import { adminRoleLabel } from "./adminRoles";

// Confirmed 2026-09-24: the top role is called "Admin" in the interface.
// The stored enum value stays "superadmin" (database, RLS and RPCs use it).
test("superadmin is shown as Admin", () => {
  expect(adminRoleLabel("superadmin")).toBe("Admin");
});

test("moderator is shown as Moderator", () => {
  expect(adminRoleLabel("moderator")).toBe("Moderator");
});

test("an unknown or missing role falls back to a neutral label", () => {
  expect(adminRoleLabel(undefined)).toBe("Staff");
  expect(adminRoleLabel("auditor")).toBe("Staff");
});

test("the dashboard's generic 'admin' fallback also reads as Admin", () => {
  expect(adminRoleLabel("admin")).toBe("Admin");
});
