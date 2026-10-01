"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { accountName } from "@/lib/accountName";
import { clearOfflineLeads, discardLegacyLeads } from "@/lib/offline-leads";
import { createClient } from "@/lib/supabase/client";
import type { IdentityDeletionResult } from "@/lib/accountDeletion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideDeletionOutcome } from "@/lib/accountDeletion";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: appUser } = useCurrentUser();
  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/");
  };
  const router = useRouter();
  // Goes through a route handler rather than the RPC directly: removing the
  // auth identity needs the service-role key, which must never reach the
  // browser. See app/api/account/delete/route.ts.
  const deleteAccount = async () => {
    const res = await fetch("/api/account/delete", { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? "Failed to delete account");
    return body as { identityDeletion: IdentityDeletionResult };
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete") return;

    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteAccount();
      // Queued offline leads hold visitors' details; they go with the account,
      // and so does the pre-2026-09-25 shared queue, which may hold this
      // account's leads and has no other owner to answer for it.
      if (user?.id) clearOfflineLeads(user.id);
      discardLegacyLeads();
      // Your Convex data (profiles, leads, etc.) is always erased at
      // this point — that part is atomic and already committed. The
      // Clerk identity itself may not be: if CLERK_SECRET_KEY isn't
      // configured (or Clerk's API call failed), don't let that go
      // unnoticed just because we're about to sign the tab out — see
      // convex/users.ts#deleteMyAccount for why this can legitimately
      // happen and isn't a bug in the erasure itself.
      //
      // decideDeletionOutcome (lib/accountDeletion.ts) is the tested
      // decision of whether to warn and how long to hold this screen
      // before redirecting, so the warning is actually readable
      // instead of a flash before signOut() navigates the tab away.
      const outcome = decideDeletionOutcome(result.identityDeletion);
      if (outcome.showWarningToast && outcome.toastMessage) {
        toast.warning(outcome.toastMessage, { duration: outcome.redirectDelayMs });
        await new Promise((resolve) => setTimeout(resolve, outcome.redirectDelayMs));
      }
      await signOut();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Settings" description="Manage your account and personal information." />

      <div className="border-[1.5px] border-input bg-background p-8 space-y-6">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Full name</Label>
          <Input value={accountName(appUser, user?.user_metadata)} readOnly disabled />
          <p className="text-[13px] text-muted-foreground">Managed by your sign-in account</p>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Email address</Label>
          <Input defaultValue={user?.email || ""} disabled />
        </div>

        <div className="border-t-[1.5px] border-input pt-6">
          <h3 className="text-lg font-bold text-destructive mb-2">Danger zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your profile, leads, and account data per privacy regulations (RA
            10173).
          </p>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  Delete account permanently?
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm text-muted-foreground space-y-2">
                  This action cannot be undone. This will permanently delete:
                  <ul className="list-disc list-inside mt-2 text-foreground font-medium space-y-1">
                    <li>Your published profiles</li>
                    <li>All captured leads</li>
                    <li>Notifications and store carts</li>
                  </ul>
                  <span className="block mt-2 text-xs text-muted-foreground">
                    Note: Any paired NFC cards will be unlinked and returned to inventory status.
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <Label className="text-[13px] font-semibold">
                  Type <span className="font-bold text-destructive">DELETE</span> to confirm:
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={confirmText.toLowerCase() !== "delete" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Permanently delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
