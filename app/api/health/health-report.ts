/**
 * Pure health-report logic for GET /api/health, kept separate from
 * `route.ts` so it can be unit-tested without a live Convex deployment or a
 * running Next.js server: `buildHealthReport` takes its Convex dependency
 * as an injected `queryConvex` function instead of constructing a
 * `ConvexHttpClient` itself.
 *
 * SECURITY: every field below is a boolean. Nothing here may ever carry a
 * secret's value, length, or prefix, or an internal error message/stack —
 * this endpoint is public and unauthenticated.
 */

// Required NEXT_PUBLIC_* vars on the web (Next.js/Vercel) side. Keep in
// sync with the README's env var table.
const REQUIRED_WEB_ENV_VARS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CONVEX_URL",
] as const;

export type WebEnvPresence = Record<(typeof REQUIRED_WEB_ENV_VARS)[number], boolean>;

// Mirrors convex/health.ts's ConfigPresence shape. Duplicated (rather than
// imported from convex/) because app/ and convex/ are separate bundling
// roots in this project; the fields are kept in sync by convention and by
// the route-level test that exercises the real Convex query.
export type ConfigPresence = {
  RESEND_API_KEY: boolean;
  CLERK_SECRET_KEY: boolean;
  CLERK_WEBHOOK_SIGNING_SECRET: boolean;
  NEXT_PUBLIC_APP_URL: boolean;
};

export interface ConvexReachability {
  reachable: boolean;
  config: ConfigPresence | null;
}

export interface HealthReportBody {
  status: "healthy" | "degraded" | "unhealthy";
  convex: boolean;
  env: WebEnvPresence;
  config: ConfigPresence | null;
}

export interface HealthReport {
  status: 200 | 503;
  body: HealthReportBody;
}

export interface BuildHealthReportDeps {
  env: Record<string, string | undefined>;
  queryConvex: () => Promise<ConvexReachability>;
}

/**
 * Builds the /api/health response. HTTP status only ever reflects whether
 * Convex — the one hard dependency an uptime monitor should page on — is
 * reachable: 200 when reachable, 503 when not. Missing web env vars or
 * missing Convex-side secrets don't 503 the route (auth/browsing can still
 * work), but they do surface as `status: "degraded"` in the body so the
 * misconfiguration is visible in the same response instead of silent.
 */
export async function buildHealthReport(deps: BuildHealthReportDeps): Promise<HealthReport> {
  const env = Object.fromEntries(
    REQUIRED_WEB_ENV_VARS.map((key) => [key, Boolean(deps.env[key]?.trim())]),
  ) as WebEnvPresence;

  const { reachable, config } = await deps.queryConvex();

  const envOk = Object.values(env).every(Boolean);
  const configOk = config !== null && Object.values(config).every(Boolean);

  const status: HealthReportBody["status"] = !reachable
    ? "unhealthy"
    : envOk && configOk
      ? "healthy"
      : "degraded";

  return {
    status: reachable ? 200 : 503,
    body: { status, convex: reachable, env, config },
  };
}
