import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { IdentityDeletionResult } from "@/lib/accountDeletion";

/**
 * Account deletion, in the two halves it actually has.
 *
 * 1. The APPLICATION data -- profiles, leads, notifications, cart, team -- is
 *    erased by delete_my_account(), running as the signed-in user. That half
 *    is one transaction: it either all goes or none of it does. Their cards
 *    are returned to inventory rather than destroyed, because the physical
 *    object still exists.
 *
 * 2. The AUTH IDENTITY is a separate system and needs the service-role key,
 *    which is why this is a route handler and not an RPC. It can legitimately
 *    fail on its own -- an unconfigured key, an auth-server error -- while
 *    half 1 has already committed.
 *
 * The two halves are reported separately and honestly. Signing the user out
 * and redirecting on a degraded outcome is indistinguishable from full
 * success: nobody without devtools open would learn their login still exists
 * and they can sign back in. The Settings dialog promises deletion "per
 * privacy regulations (RA 10173)", so a half-completed deletion has to say so.
 *
 * Ordering is deliberate: data first, identity second. The reverse would leave
 * an orphaned data set belonging to an identity that no longer exists, and no
 * signed-in session able to reach it.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: deleted, error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  let identityDeletion: IdentityDeletionResult;
  try {
    const admin = createServiceClient();
    const { error: adminError } = await admin.auth.admin.deleteUser(user.id);
    identityDeletion = adminError
      ? {
          status: "failed",
          message:
            "Your data has been erased, but your login could not be removed. " +
            "Please contact support so it can be completed.",
        }
      : { status: "deleted", message: "Account fully deleted." };
  } catch {
    // createServiceClient throws when SUPABASE_SERVICE_ROLE_KEY is absent --
    // the common case in a preview or local environment. Reported as
    // pending_configuration rather than failed, because nothing is broken;
    // the deployment is simply missing a key.
    identityDeletion = {
      status: "pending_configuration",
      message:
        "Your data has been erased, but login removal is not configured on this " +
        "deployment, so you may still be able to sign in.",
    };
  }

  return NextResponse.json({ ...(deleted as object), identityDeletion });
}
