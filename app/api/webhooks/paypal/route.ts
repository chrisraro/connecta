import { NextResponse } from "next/server";

/**
 * Deprecated: replaced by PayRex.
 *
 * PayPal has been removed. Payment confirmation is now handled by the PayRex
 * webhook implemented as a Convex HTTP action at /webhooks/payrex
 * (https://<deployment>.convex.site/webhooks/payrex). This route is retained
 * only to return HTTP 410 Gone for any lingering PayPal webhook traffic.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Gone: PayPal has been replaced by PayRex." },
    { status: 410 }
  );
}
