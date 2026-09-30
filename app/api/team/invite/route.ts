import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors";
import { inviteEmailData } from "@/lib/inviteEmail";

/**
 * Team invites (owner decision, 2026-09-27): consent, not silent membership.
 *
 * team_invite_member (20260927000029) always inserts a PENDING row and
 * returns { inviteId, hasAccount }. What happens next depends on hasAccount,
 * and that decision needs the service-role key, which is why this is a route
 * rather than a client-side RPC call:
 *
 *   - hasAccount === false: nobody has ever signed up with that address, so
 *     there is no in-app inbox to put a notice in. Supabase's own
 *     "invite user" email gives them a link that creates their account (see
 *     the SQL migration's header and this file's REDIRECT/template comment).
 *   - hasAccount === true: the RPC already inserted an in-app notification
 *     for that user (team_invite_member does this itself, atomically, since
 *     the caller's session client has no insert grant on `notifications`).
 *     get_my_invites() is what actually renders the pending-invite banner.
 *
 * Middleware already requires a session on every /api/* route not in its
 * public allow-list; the getUser() check below is defence in depth, not the
 * boundary -- team_invite_member re-checks ownership and seats itself.
 */

const MAX_EMAIL_LENGTH = 254;

type InviteBody = { email?: unknown };

export async function POST(request: NextRequest) {
  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json({ message: "Enter a valid email address.", details: "INVALID_EMAIL", code: "P0001" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("team_invite_member", { invite_email: email });

  if (error) {
    // Our own raised exceptions carry a stable code in `details`; pass them
    // through unchanged so the client's toUserMessage/errorCode read them --
    // seat limit, not-an-owner, already-a-member, duplicate invite, etc.
    if (error.code === "P0001") {
      return NextResponse.json(
        { message: error.message, details: error.details, code: error.code },
        { status: 400 },
      );
    }
    console.error("team_invite_member failed:", error);
    return NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }

  const result = data as { inviteId: string; hasAccount: boolean };

  if (result.hasAccount) {
    return NextResponse.json({ inviteId: result.inviteId, hasAccount: true, emailSent: false });
  }

  // A brand-new address: send Supabase's built-in invite email. This needs
  // the service-role client -- auth.admin is not reachable with the user's
  // own session -- and its failure must NOT undo the invite that already
  // exists in team_invites: the owner can still share the join instructions
  // by hand, and the pending row is exactly what lets a re-invite attempt
  // later see DUPLICATE_INVITE instead of silently doubling up.
  //
  // The template (supabase/templates/invite.html) names the inviter and the
  // team, so the email reads as a known person's request rather than an
  // anonymous "you have been invited". Both reads go through the caller's
  // own session: teams_select_member and users_select_own_or_admin already
  // let an owner read their own rows. A failed read only loses the names,
  // never the email.
  const [{ data: team }, { data: inviter }] = await Promise.all([
    supabase.from("teams").select("name, company_name").eq("owner_id", user.id).maybeSingle(),
    supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
  ]);
  const emailData = inviteEmailData({
    inviterName: inviter?.name,
    inviterEmail: user.email,
    teamName: team?.name,
    companyName: team?.company_name,
  });

  let emailSent = true;
  let warning: string | undefined;
  try {
    const admin = createServiceClient();
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${request.nextUrl.origin}/auth/callback`,
      data: emailData,
    });
    if (inviteError) {
      emailSent = false;
      warning = "The invite was saved, but the email could not be sent. Share the sign-up link with them directly.";
      console.error("inviteUserByEmail failed:", inviteError);
    }
  } catch (e) {
    // createServiceClient() throws when SUPABASE_SERVICE_ROLE_KEY is absent
    // (a preview/local deployment). Same outcome as an email failure above:
    // the invite still stands, the owner is told to share the link by hand.
    emailSent = false;
    warning = "The invite was saved, but no invite email could be sent from this deployment. Share the sign-up link with them directly.";
    console.error("createServiceClient/inviteUserByEmail failed:", e);
  }

  return NextResponse.json({ inviteId: result.inviteId, hasAccount: false, emailSent, warning });
}
