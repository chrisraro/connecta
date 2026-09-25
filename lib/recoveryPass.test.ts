import { describe, expect, test } from "vitest";
import { RECOVERY_PASS_TTL_MS, signRecoveryPass, verifyRecoveryPass } from "./recoveryPass";

// B5 security review (2026-09-25): /auth/update-password trusted any signed-in
// session. Only a session that came through a verified reset link may set a
// new password there, proven by a short-lived pass signed by the server.
const SECRET = "test-secret-not-real";
const T0 = 1_790_000_000_000;

describe("recovery pass", () => {
  test("a pass verifies for the account it was issued to", async () => {
    const pass = await signRecoveryPass("user-a", T0, SECRET);
    expect(await verifyRecoveryPass(pass, "user-a", T0 + 1_000, SECRET)).toBe(true);
  });

  test("it does not verify for another account", async () => {
    const pass = await signRecoveryPass("user-a", T0, SECRET);
    expect(await verifyRecoveryPass(pass, "user-b", T0, SECRET)).toBe(false);
  });

  test("it expires", async () => {
    const pass = await signRecoveryPass("user-a", T0, SECRET);
    expect(await verifyRecoveryPass(pass, "user-a", T0 + RECOVERY_PASS_TTL_MS + 1, SECRET)).toBe(false);
  });

  test("a forged or tampered pass is rejected", async () => {
    const pass = await signRecoveryPass("user-a", T0, SECRET);
    const [id, exp, sig] = pass.split(".");
    expect(await verifyRecoveryPass(`${id}.${Number(exp) + 60_000}.${sig}`, "user-a", T0, SECRET)).toBe(false);
    expect(await verifyRecoveryPass(`user-a.${exp}.AAAA`, "user-a", T0, SECRET)).toBe(false);
    expect(await verifyRecoveryPass(await signRecoveryPass("user-a", T0, "other"), "user-a", T0, SECRET)).toBe(false);
  });

  test("missing pieces fail closed", async () => {
    const pass = await signRecoveryPass("user-a", T0, SECRET);
    expect(await verifyRecoveryPass(undefined, "user-a", T0, SECRET)).toBe(false);
    expect(await verifyRecoveryPass("garbage", "user-a", T0, SECRET)).toBe(false);
    expect(await verifyRecoveryPass(pass, undefined, T0, SECRET)).toBe(false);
    expect(await verifyRecoveryPass(pass, "user-a", T0, undefined)).toBe(false);
  });
});
