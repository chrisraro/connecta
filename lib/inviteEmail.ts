/**
 * Metadata handed to Supabase's "Invite user" email template.
 *
 * inviteUserByEmail(email, { data }) stores `data` as the invited user's
 * user_metadata, and the template reads it as {{ .Data.<key> }} (see
 * supabase/templates/invite.html). Without it the email can only say "you
 * have been invited" -- no inviter, no team -- which reads exactly like
 * phishing to both the recipient and a spam filter.
 *
 * Keys are deliberately NOT `name` or `full_name`: handle_new_user
 * (20260911000008) copies those into public.users.name, and the invitee's
 * own name must not become their inviter's.
 *
 * Both values are owner-typed, so they are trimmed, stripped of control
 * characters and angle brackets, and capped: the template renders them
 * inside a sentence and a subject-like heading, and a 500-character "team
 * name" is how a teammate invite gets turned into a spam payload.
 */

const MAX_FIELD_LENGTH = 60;

export type InviteEmailData = {
  inviter_name: string;
  team_name: string;
};

export function cleanInviteField(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= MAX_FIELD_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_FIELD_LENGTH - 1).trimEnd()}…`;
}

export function inviteEmailData(args: {
  inviterName?: string | null;
  inviterEmail?: string | null;
  teamName?: string | null;
  companyName?: string | null;
}): InviteEmailData {
  // Fall back to the inviter's email so the sentence always names a real
  // person; "Someone invited you" is the phrasing filters score worst.
  const inviter =
    cleanInviteField(args.inviterName) || cleanInviteField(args.inviterEmail) || "A teammate";
  const team =
    cleanInviteField(args.companyName) || cleanInviteField(args.teamName) || "their team";
  return { inviter_name: inviter, team_name: team };
}
