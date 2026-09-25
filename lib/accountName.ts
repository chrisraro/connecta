/**
 * The account holder's name for display. public.users is the source of truth;
 * the sign-in provider's metadata only fills in when it is empty.
 */
export function accountName(
  appUser: { name?: string | null } | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): string {
  for (const candidate of [appUser?.name, metadata?.full_name, metadata?.name]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}
