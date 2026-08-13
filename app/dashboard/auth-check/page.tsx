"use client";

import { useQuery } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { SIGMATAP } from "@/lib/brand";

/**
 * Clerk -> Convex auth chain smoke test.
 *
 * WHY THIS PAGE EXISTS
 * --------------------
 * The chain that authenticates a Convex request has four independent links,
 * and three of them live outside this repo:
 *
 *   1. middleware.ts protects the route (in repo)
 *   2. ConvexProviderWithClerk asks Clerk for a token via the JWT template
 *      named in convex/auth.config.ts's applicationID  (Clerk dashboard)
 *   3. that template must exist and mint aud: "convex"  (Clerk dashboard)
 *   4. Convex verifies the token against auth.config.ts's domain  (in repo)
 *
 * Link 3 silently broke the entire authenticated app once already: the Clerk
 * instance had ZERO JWT templates, so getToken({template:"convex"}) returned
 * null, ctx.auth.getUserIdentity() was null on every call, and every
 * authenticated page threw "Unauthorized: authentication required". Nothing
 * in the codebase was wrong, so nothing in the test suite could catch it.
 *
 * This page makes that class of failure visible in one glance instead of
 * surfacing as a generic error on some unrelated screen. It is deliberately
 * a route, not a unit test: the failure mode is environmental, and a test
 * running against convex-test's in-memory harness would pass regardless.
 *
 * Route lives under /dashboard so middleware already protects it, and so it
 * cannot collide with a user's vanity profile slug at /<slug>.
 */
export default function AuthCheckPage() {
  const { isLoaded: clerkLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  // A genuinely protected query: convex/users.ts:getUser reads ctx.auth
  // and returns null when the request carries no verified identity. If the
  // JWT template is missing this stays null forever even while Clerk itself
  // reports a healthy session — which is exactly the split this page exposes.
  const convexUser = useQuery(api.users.getUser, {});

  const rows: Array<{ label: string; ok: boolean | null; detail: string }> = [
    {
      label: "Clerk session",
      ok: clerkLoaded ? Boolean(isSignedIn) : null,
      detail: !clerkLoaded
        ? "loading…"
        : isSignedIn
          ? `signed in as ${user?.primaryEmailAddress?.emailAddress ?? userId}`
          : "not signed in",
    },
    {
      label: "Convex identity",
      ok: convexUser === undefined ? null : convexUser !== null,
      detail:
        convexUser === undefined
          ? "loading…"
          : convexUser === null
            ? "ctx.auth.getUserIdentity() is null — the Clerk JWT template named in convex/auth.config.ts is missing or misconfigured"
            : `verified as ${convexUser.email}`,
    },
    {
      label: "User synced to Convex",
      ok: convexUser === undefined ? null : Boolean(convexUser?._id),
      detail:
        convexUser === undefined
          ? "loading…"
          : convexUser
            ? `users row ${convexUser._id}`
            : "no row — syncUser has not run for this account",
    },
  ];

  const allPassing = rows.every((r) => r.ok === true);
  const anyFailing = rows.some((r) => r.ok === false);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-black tracking-tight text-foreground">
        Auth chain check
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Verifies that a Clerk session actually produces a verified identity
        inside a Convex query. Every link below must pass for authenticated
        {" "}
        {SIGMATAP.name} features to work.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-start gap-3 rounded-[var(--r-md)] border border-border bg-card p-4"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                r.ok === null
                  ? "bg-muted text-muted-foreground"
                  : r.ok
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-destructive/15 text-destructive"
              }`}
            >
              {r.ok === null ? "…" : r.ok ? "✓" : "✕"}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {r.label}
                <span className="sr-only">
                  {r.ok === null ? " — checking" : r.ok ? " — passing" : " — failing"}
                </span>
              </span>
              <span className="mt-0.5 block break-words text-sm text-muted-foreground">
                {r.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p
        role="status"
        className={`mt-6 rounded-[var(--r-md)] border p-4 text-sm ${
          allPassing
            ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
            : anyFailing
              ? "border-destructive/30 bg-destructive/5 text-foreground"
              : "border-border bg-card text-muted-foreground"
        }`}
      >
        {allPassing
          ? "All links passing — Clerk sessions are reaching Convex with a verified identity."
          : anyFailing
            ? "Broken. If “Clerk session” passes but “Convex identity” fails, the Clerk JWT template is the cause: create one named to match applicationID in convex/auth.config.ts, with claims {“aud”: “convex”}."
            : "Checking…"}
      </p>
    </div>
  );
}
