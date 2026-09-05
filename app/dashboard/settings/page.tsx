"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useClerk } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const deleteAccount = useAction(api.users.deleteMyAccount);

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
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your personal information.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Full Name</Label>
          <Input
            defaultValue={user?.fullName || ""}
            className="bg-muted/50 border-border focus:border-primary transition-colors"
            disabled
          />
          <p className="text-xs text-muted-foreground">Managed via Clerk Auth</p>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Email Address</Label>
          <Input
            defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
            className="bg-muted/50 border-border focus:border-primary transition-colors"
            disabled
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-bold text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your profile, leads, and account data per privacy regulations (RA
            10173).
          </p>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none font-semibold"
              >
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  Delete Account Permanently?
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
                <Label className="text-xs font-semibold">
                  Type <span className="font-bold text-destructive">DELETE</span> to confirm:
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="uppercase font-mono"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Permanently Delete"
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
