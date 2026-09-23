import { NextResponse, after } from "next/server";
import { Resend } from "resend";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CONNECTA } from "@/lib/brand";
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors";

/**
 * Inquiry submission. Ports convex/leads.ts createLead + convex/email.ts
 * sendLeadNotification.
 *
 * A route rather than a client insert because two things need a server: the
 * rate limit keys on the caller's IP, which the browser cannot be trusted to
 * report, and the owner's notification email is sent to an address the
 * submitter must never see. submit_lead() is callable ONLY by service_role
 * (20260924000023), so this handler is the single way a lead enters the
 * database.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LeadBody = {
  owner_id?: unknown;
  inquirer_name?: unknown;
  inquirer_contact?: unknown;
  message?: unknown;
  property_id?: unknown;
  property_name?: unknown;
};

const str = (v: unknown) => (typeof v === "string" ? v : null);

// Resend does not escape, and every interpolated field below was typed by an
// anonymous stranger. The Convex template interpolated them raw.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * On Vercel, x-forwarded-for is overwritten by the platform with the real
 * client address, so its first entry is not caller-controlled there. Locally
 * it is absent and every request shares the "anon" bucket, which is fine.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || null;
  return request.headers.get("x-real-ip");
}

async function sendLeadEmail(args: {
  to: string;
  inquirerName: string;
  inquirerContact: string;
  propertyName: string | null;
  message: string | null;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not configured. Lead email not sent.");
    return;
  }

  const regarding = args.propertyName ? `regarding ${args.propertyName}` : "from your profile";
  const dashboard = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/leads`;

  const { error } = await new Resend(key).emails.send({
    // Until a sending domain is verified in Resend, the resend.dev sender only
    // delivers to the Resend account owner. Set RESEND_FROM_EMAIL once one is.
    from: process.env.RESEND_FROM_EMAIL || `${CONNECTA.name} <onboarding@resend.dev>`,
    to: args.to,
    // Subjects are plain text, not HTML -- no escaping, but no newlines either.
    subject: `New lead ${regarding} - ${args.inquirerName}`.replace(/[\r\n]+/g, " "),
    html: `
      <h2>You have a new inquiry!</h2>
      <p><strong>Name:</strong> ${escapeHtml(args.inquirerName)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(args.inquirerContact)}</p>
      ${args.propertyName ? `<p><strong>Interest:</strong> ${escapeHtml(args.propertyName)}</p>` : ""}
      <p><strong>Message:</strong><br/>${args.message ? escapeHtml(args.message).replace(/\n/g, "<br/>") : "No message provided."}</p>
      <p><a href="${escapeHtml(dashboard)}">Open your ${escapeHtml(CONNECTA.name)} dashboard</a> to reply.</p>
    `,
  });
  if (error) console.error("Lead email failed:", error);
}

export async function POST(request: Request) {
  let body: LeadBody;
  try {
    body = (await request.json()) as LeadBody;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const ownerId = str(body.owner_id);
  const propertyId = str(body.property_id);
  if (!ownerId || !UUID.test(ownerId) || (propertyId && !UUID.test(propertyId))) {
    return NextResponse.json({ message: "Invalid recipient." }, { status: 400 });
  }

  // Who is asking, from the session cookie -- never from the body. Only the
  // owner writing into their own inbox is exempt from the limits.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const selfCapture = user?.id === ownerId;

  let service;
  try {
    service = createServiceClient();
  } catch {
    console.error("SUPABASE_SERVICE_ROLE_KEY missing: lead submission is disabled.");
    return NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 503 });
  }

  const { data, error } = await service.rpc("submit_lead", {
    lead_owner: ownerId,
    inquirer_name: str(body.inquirer_name) ?? "",
    inquirer_contact: str(body.inquirer_contact) ?? "",
    message: str(body.message) ?? undefined,
    property_id: propertyId ?? undefined,
    property_name: str(body.property_name) ?? undefined,
    visitor_key: clientIp(request) ?? undefined,
    self_capture: selfCapture,
  });

  if (error) {
    // Our own raised exceptions are written for people and carry a stable
    // code in `details`; pass them through in PostgREST shape so the client's
    // toUserMessage/errorCode read them unchanged. Anything else is internal.
    if (error.code === "P0001") {
      const status = error.details === "RATE_LIMIT" ? 429 : 400;
      return NextResponse.json(
        { message: error.message, details: error.details, code: error.code },
        { status },
      );
    }
    console.error("submit_lead failed:", error);
    return NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }

  const result = data as { leadId: string; ownerEmail: string | null };

  if (!selfCapture && result.ownerEmail) {
    const to = result.ownerEmail;
    // after(): the visitor gets their confirmation now; the email follows.
    // A mail failure must never turn a saved inquiry into an error.
    after(() =>
      sendLeadEmail({
        to,
        inquirerName: (str(body.inquirer_name) ?? "").trim(),
        inquirerContact: (str(body.inquirer_contact) ?? "").trim(),
        propertyName: str(body.property_name)?.trim() || null,
        message: str(body.message)?.trim() || null,
      }).catch((e) => console.error("Lead email failed:", e)),
    );
  }

  return NextResponse.json({ leadId: result.leadId });
}
