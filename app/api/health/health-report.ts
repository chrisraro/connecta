/**
 * Pure health-report logic for GET /api/health, kept separate from
 * `route.ts` so it can be unit-tested without a live database or a running
 * Next.js server: `buildHealthReport` takes its reachability check as an
 * injected `pingDatabase` function instead of constructing a client itself.
 *
 * SECURITY: every field below is a boolean. Nothing here may ever carry a
 * secret's value, length, or prefix, or an internal error message/stack —
 * this endpoint is public and unauthenticated.
 */

// Required NEXT_PUBLIC_* vars on the web (Next.js/Vercel) side. Keep in
// sync with the README's env var table.
const REQUIRED_WEB_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type WebEnvPresence = Record<(typeof REQUIRED_WEB_ENV_VARS)[number], boolean>;

// Server-only secrets. These no longer need a round trip to ask about:
// Convex ran in its own runtime with its own environment, so config presence
// had to be queried from it. Everything server-side now runs in this process,
// so process.env is the whole answer.
export type ConfigPresence = {
  RESEND_API_KEY: boolean;
  SUPABASE_SERVICE_ROLE_KEY: boolean;
};

export interface DatabaseReachability {
  reachable: boolean;
}

export interface HealthReportBody {
  status: "healthy" | "degraded" | "unhealthy";
  database: boolean;
  env: WebEnvPresence;
  config: ConfigPresence;
}

export interface HealthReport {
  status: 200 | 503;
  body: HealthReportBody;
}

export interface BuildHealthReportDeps {
  env: NodeJS.ProcessEnv | Record<string, string | undefined>;
  pingDatabase: () => Promise<DatabaseReachability>;
}

/**
 * Builds the /api/health response. HTTP status only ever reflects whether the
 * DATABASE — the one hard dependency an uptime monitor should page on — is
 * reachable: 200 when reachable, 503 when not. Missing env vars or secrets do
 * not 503 the route (browsing still works), but they surface as
 * `status: "degraded"` in the body so the misconfiguration is visible in the
 * same response rather than silent.
 */
export async function buildHealthReport(deps: BuildHealthReportDeps): Promise<HealthReport> {
  const env = Object.fromEntries(
    REQUIRED_WEB_ENV_VARS.map((key) => [key, Boolean(deps.env[key]?.trim())]),
  ) as WebEnvPresence;

  const { reachable } = await deps.pingDatabase();

  const config: ConfigPresence = {
    RESEND_API_KEY: Boolean(deps.env.RESEND_API_KEY?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(deps.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };

  const envOk = Object.values(env).every(Boolean);
  const configOk = Object.values(config).every(Boolean);

  const status: HealthReportBody["status"] = !reachable
    ? "unhealthy"
    : envOk && configOk
      ? "healthy"
      : "degraded";

  return {
    status: reachable ? 200 : 503,
    body: { status, database: reachable, env, config },
  };
}
