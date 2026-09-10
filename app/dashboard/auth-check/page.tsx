"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser, useIsAdmin } from "@/hooks/useCurrentUser";
import { CONNECTA } from "@/lib/brand";

/**
 * Supabase auth-chain smoke test.
 *
 * WHY THIS PAGE EXISTS
 * --------------------
 * It replaces the Clerk version, which diagnosed a JWT-template chain that no
 * longer exists. The Supabase chain is shorter but still has links that can
 * break without any code being wrong:
 *
 *   1. middleware refreshes the session cookie on every request  (in repo)
 *   2. the browser client is configured with URL + publishable key  (env)
 *   3. a public.users row exists for the auth user  (database trigger)
 *   4. RLS resolves that row, and is_admin() answers  (database)
 *
 * Link 3 is the one that bites. Every RLS policy resolves ownership through
 * public.users, so an auth account without its mirror row can sign in and then
 * see nothing at all -- which looks like data loss, not a broken trigger. That
 * failure is invisible from any feature screen, and no test can catch it
 * because nothing in the repo is wrong when it happens.
 *
 * Deliberately a route rather than a unit test: the failure mode is
 * environmental. Kept out of the nav; visit /dashboard/auth-check directly.
 */
export default function AuthCheckPage() {
  const { user, isLoaded, isSignedIn } = useAuth();
  const { data: appUser, isPending: userPending, error: userError } = useCurrentUser();
  const { data: isAdmin, isPending: adminPending, error: adminError } = useIsAdmin();

  const rows: { label: string; ok: boolean | null; detail: string }[] = [
    {
      label: "1. Session resolved (middleware + browser client)",
      ok: isLoaded ? isSignedIn : null,
      detail: !isLoaded
        ? "resolving..."
        : isSignedIn
          ? `signed in as ${user?.email ?? user?.id}`
          : "no session — sign in first",
    },
    {
      label: "2. NEXT_PUBLIC_SUPABASE_URL configured",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
    },
    {
      label: "3. public.users row exists (signup trigger)",
      ok: userPending ? null : Boolean(appUser),
      detail: userError
        ? `error: ${userError.message}`
        : userPending
          ? "loading..."
          : appUser
            ? `id ${appUser.id} · plan ${appUser.plan}`
            : "NO ROW — handle_new_user did not fire for this account",
    },
    {
      label: "4. RLS + is_admin() answer",
      ok: adminPending ? null : !adminError,
      detail: adminError
        ? `error: ${adminError.message}`
        : adminPending
          ? "loading..."
          : isAdmin
            ? "admin grant present"
            : "no admin grant (expected for a normal account)",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{CONNECTA.name} auth chain</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each link below can fail without any code being wrong. Check them in order.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start gap-3 rounded-2xl border border-border p-4 bg-card"
          >
            <span
              aria-hidden
              className={`mt-0.5 inline-block w-3 h-3 rounded-full shrink-0 ${
                row.ok === null
                  ? "bg-muted-foreground/40"
                  : row.ok
                    ? "bg-emerald-500"
                    : "bg-red-500"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{row.label}</p>
              <p className="text-xs text-muted-foreground break-all">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
