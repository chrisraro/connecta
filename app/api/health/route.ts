import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { buildHealthReport, type ConvexReachability } from "./health-report";

/**
 * GET /api/health — public, unauthenticated diagnostic endpoint.
 *
 * Exists so a misconfigured deployment (missing PayRex/Resend/Clerk secrets,
 * an unset NEXT_PUBLIC_APP_URL, a Convex deployment that can't be reached)
 * shows up in one request instead of surfacing later as a customer-facing
 * throw. See `./health-report.ts` for the response-shape logic (tested in
 * isolation there) and `convex/health.ts` for the Convex-side query this
 * calls.
 *
 * Never cached — always reflects the current, live configuration.
 */
export async function GET() {
  const report = await buildHealthReport({
    env: process.env,
    queryConvex,
  });

  return NextResponse.json(report.body, {
    status: report.status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Calls the real Convex deployment. Any failure — bad/missing
// NEXT_PUBLIC_CONVEX_URL, network error, deployment down — collapses to
// `{ reachable: false, payments: null }`. Deliberately swallows the actual
// error: this route is public, so its response must never carry internal
// error text or a stack trace that could help an attacker map the backend.
async function queryConvex(): Promise<ConvexReachability> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return { reachable: false, payments: null };
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const [, payments] = await Promise.all([
      client.query(api.health.ping, {}),
      client.query(api.health.checkConfig, {}),
    ]);
    return { reachable: true, payments };
  } catch {
    return { reachable: false, payments: null };
  }
}
