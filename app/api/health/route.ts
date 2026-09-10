import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildHealthReport, type DatabaseReachability } from "./health-report";

/**
 * GET /api/health — public, unauthenticated diagnostic endpoint.
 *
 * Exists so a misconfigured deployment (a missing Resend or service-role key,
 * an unset NEXT_PUBLIC_APP_URL, a database that cannot be reached) shows up in
 * one request instead of surfacing later as a customer-facing throw. See
 * ./health-report.ts for the response-shape logic, tested in isolation there.
 *
 * Never cached — always reflects the current, live configuration.
 */
export async function GET() {
  const report = await buildHealthReport({
    env: process.env,
    pingDatabase,
  });

  return NextResponse.json(report.body, {
    status: report.status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Reachability check against the real database.
 *
 * Reads a table that is PUBLIC by policy, so an anonymous client is enough --
 * this must not need the service-role key to answer, or an uptime monitor
 * would be reporting on a credential rather than on the database.
 *
 * `head: true` with an exact count fetches no rows at all: the query proves
 * the connection and the policy work without moving data on every poll.
 *
 * Any failure collapses to `{ reachable: false }`. Deliberately swallows the
 * error: this route is public, so its response must never carry internal
 * error text or a stack trace that could help map the backend.
 */
async function pingDatabase(): Promise<DatabaseReachability> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { reachable: false };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").select("id", { count: "exact", head: true });
    return { reachable: !error };
  } catch {
    return { reachable: false };
  }
}
