/**
 * A short-lived, server-signed pass proving this browser came through a
 * verified password-reset link (B5 security review, 2026-09-25).
 *
 * Without it, /auth/update-password trusted any signed-in session: a stolen
 * session could change the password without the old one, and an attacker
 * could mail a victim a reset link for the attacker's own account and have
 * the victim keep working inside it. The pass is set when a recovery link
 * verifies, is checked by middleware and by the route that saves the
 * password, and is cleared once the password is changed.
 *
 * Format: `<userId>.<expiresAtMs>.<base64url HMAC-SHA256>`. Web Crypto, so it
 * runs in middleware and in route handlers alike.
 */

export const RECOVERY_PASS_COOKIE = "connecta_recovery";
export const RECOVERY_PASS_TTL_MS = 15 * 60_000;

/** The signing secret. Missing means no pass verifies: reset fails closed. */
export function recoveryPassSecret(): string | undefined {
  return process.env.RECOVERY_PASS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    // Domain-separated, so the pass key is never the raw secret.
    encoder.encode(`connecta-recovery-pass:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signRecoveryPass(userId: string, now: number, secret: string): Promise<string> {
  const payload = `${userId}.${now + RECOVERY_PASS_TTL_MS}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyRecoveryPass(
  value: string | undefined,
  userId: string | undefined,
  now: number,
  secret: string | undefined,
): Promise<boolean> {
  if (!value || !userId || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts;
  const expires = Number(exp);
  if (id !== userId || !Number.isFinite(expires) || expires < now) return false;
  return sameString(sig, await hmac(`${id}.${exp}`, secret));
}
