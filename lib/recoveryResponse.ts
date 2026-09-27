import { NextResponse } from "next/server";
import {
  RECOVERY_PASS_COOKIE,
  RECOVERY_PASS_TTL_MS,
  recoveryPassSecret,
  signRecoveryPass,
} from "./recoveryPass";
import { completeRecovery } from "./authRecovery";

/**
 * Finish a recovery link: verify it, and on success redirect to Set a new
 * password carrying a signed recovery pass. Server only.
 */
export async function recoveryRedirect(
  origin: string,
  verify: () => Promise<string | null>,
): Promise<NextResponse> {
  const secret = recoveryPassSecret();
  const result = await completeRecovery(verify, async (userId) =>
    secret ? signRecoveryPass(userId, Date.now(), secret) : null,
  );
  const response = NextResponse.redirect(new URL(result.location, origin));
  if (result.pass) {
    response.cookies.set(RECOVERY_PASS_COOKIE, result.pass, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_PASS_TTL_MS / 1000,
    });
  }
  return response;
}
