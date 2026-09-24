/**
 * Display names for admin roles. The stored `admin_role` enum keeps its
 * values ("superadmin", "moderator") because the database, RLS policies and
 * RPCs depend on them; only what people read changes. Confirmed 2026-09-24:
 * the top role is called "Admin".
 */
const LABELS: Record<string, string> = {
  superadmin: "Admin",
  admin: "Admin",
  moderator: "Moderator",
};

export function adminRoleLabel(role: string | null | undefined): string {
  return (role && LABELS[role]) || "Staff";
}
