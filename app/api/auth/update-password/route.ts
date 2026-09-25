import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passwordProblem } from "@/lib/authRecovery";
import { RECOVERY_PASS_COOKIE, recoveryPassSecret, verifyRecoveryPass } from "@/lib/recoveryPass";
import { toUserMessage } from "@/lib/errors";

/**
 * Save a new password after a reset link (B5). Server-side, so it can require
 * the recovery pass (not just any session), sign out every other session,
 * report honestly whether that worked, and clear the pass.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pass = request.cookies.get(RECOVERY_PASS_COOKIE)?.value;
  if (!user || !(await verifyRecoveryPass(pass, user.id, Date.now(), recoveryPassSecret()))) {
    return NextResponse.json(
      { error: "This reset link has expired. Ask for a new one." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const password =
    body && typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const problem = passwordProblem(password, password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });

  // Whoever else knew the old password loses access. Reported, not swallowed.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) {
    console.error("[password-reset] could not sign out other sessions", {
      userId: user.id,
      message: signOutError.message,
    });
  }

  const response = NextResponse.json({ othersSignedOut: !signOutError });
  response.cookies.delete(RECOVERY_PASS_COOKIE);
  return response;
}

/** "Not you?": drop the pass before signing out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(RECOVERY_PASS_COOKIE);
  return response;
}
