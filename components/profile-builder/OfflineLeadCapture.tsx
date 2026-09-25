"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, Mail, MessageSquare, Wifi, WifiOff, Upload } from "lucide-react";
import {
  adoptLegacyLeads,
  discardLegacyLeads,
  getLegacyLeadCount,
  getLegacyLeadNames,
  getUnsyncedCount,
  isOnline,
  nextRetryAt,
  saveOfflineLead,
  syncOfflineLeads,
} from "@/lib/offline-leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateLead } from "@/hooks/useLeads";
import { useAuth } from "@/components/auth/AuthProvider";

interface OfflineLeadCaptureProps {
  /** Controlled: dialog visibility now lives with the caller (the single
   * consolidated FAB in app/dashboard/layout.tsx) instead of a second,
   * independently-positioned floating trigger that used to collide with
   * the Quick Actions FAB. This component keeps mounting continuously in
   * the same place in the tree regardless of who opens it, so the
   * online/offline listeners and auto-sync effect below keep running
   * exactly as before. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires whenever the unsynced-lead count changes, so the caller can
   * surface it (e.g. a badge dot on the FAB) without duplicating the
   * localStorage bookkeeping here. */
  onUnsyncedCountChange?: (count: number) => void;
}

const plural = (n: number) => (n === 1 ? "" : "s");

export function OfflineLeadCapture({
  open,
  onOpenChange,
  onUnsyncedCountChange,
}: OfflineLeadCaptureProps) {
  const createLead = useCreateLead().mutateAsync;
  // The queue belongs to the signed-in account (B4). The auth session is read
  // locally, so this is known offline too; users.id is the auth user id.
  const { user } = useAuth();
  const ownerId = user?.id ?? "";
  // The account signed in right now, for callbacks that outlive a render
  // (an in-flight sync, a toast left on screen).
  const ownerRef = useRef(ownerId);
  useEffect(() => {
    ownerRef.current = ownerId;
  }, [ownerId]);

  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Accounts with a sync in flight. Per account, so switching accounts
  // mid-sync neither blocks the new account's sync nor lets the old one's
  // result overwrite its count, and one account never syncs twice at once.
  const inFlight = useRef(new Set<string>());

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Recount whenever the account changes: another account's queue is not ours.
  useEffect(() => {
    setUnsyncedCount(ownerId ? getUnsyncedCount(ownerId) : 0);
  }, [ownerId]);

  useEffect(() => {
    onUnsyncedCountChange?.(unsyncedCount);
  }, [unsyncedCount, onUnsyncedCountChange]);

  const runSync = useCallback(
    async (manual: boolean) => {
      if (!ownerId || inFlight.current.has(ownerId)) return null;
      inFlight.current.add(ownerId);
      setSyncing(true);
      try {
        return await syncOfflineLeads(createLead, ownerId, Date.now(), { ignoreBackoff: manual });
      } finally {
        inFlight.current.delete(ownerId);
        if (ownerRef.current === ownerId) {
          setSyncing(false);
          setUnsyncedCount(getUnsyncedCount(ownerId));
        }
      }
    },
    [createLead, ownerId],
  );

  // Auto-sync when online with queued leads, then again when the earliest
  // backoff ends. Not keyed on `syncing`: that re-ran the sync the moment the
  // last one finished, so a failing lead looped with a toast every time.
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!online || !ownerId || getUnsyncedCount(ownerId) === 0) return;
    let cancelled = false;
    let timer: number | undefined;
    (async () => {
      const result = await runSync(false);
      if (cancelled || !result || ownerRef.current !== ownerId) return;
      if (result.newlyFailed > 0) {
        toast.warning(
          `${result.newlyFailed} offline lead${plural(result.newlyFailed)} couldn't sync yet. We'll keep retrying.`,
        );
      }
      const due = nextRetryAt(ownerId);
      if (due !== null) {
        timer = window.setTimeout(() => setRetryTick((t) => t + 1), Math.max(0, due - Date.now()));
      }
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [online, ownerId, runSync, retryTick]);

  // Leads from the old shared queue have no known owner: ask before adding
  // them to this account (decided 2026-09-25). On a shared device they may be
  // someone else's, so the prompt says so and names them by first name only.
  const legacyAsked = useRef(false);
  useEffect(() => {
    if (!ownerId || legacyAsked.current) return;
    const count = getLegacyLeadCount();
    if (count === 0) return;
    legacyAsked.current = true;
    const names = getLegacyLeadNames();
    const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : "");
    toast(`${count} lead${plural(count)} saved on this device earlier`, {
      description: `${shown}. They were captured offline before leads were kept per account, and may belong to whoever used this device before you. Add them only if they're yours: once added, they sync to your leads.`,
      duration: Infinity,
      action: {
        label: "They're mine",
        onClick: () => {
          const current = ownerRef.current;
          if (!current) return;
          const added = adoptLegacyLeads(current);
          setUnsyncedCount(getUnsyncedCount(current));
          setRetryTick((t) => t + 1);
          toast.success(`Added ${added} lead${plural(added)}. Syncing now.`);
        },
      },
      cancel: {
        label: "Discard",
        onClick: () => discardLegacyLeads(),
      },
    });
  }, [ownerId]);

  const resetForm = () => {
    setName("");
    setContact("");
    setMessage("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) {
      toast.error("Sign in again to save leads.");
      return;
    }
    setSaving(true);
    const lead = { inquirerName: name, inquirerContact: contact, message: message || undefined };

    try {
      if (online) {
        await createLead({
          owner_id: ownerId,
          inquirer_name: name,
          inquirer_contact: contact,
          message: message || undefined,
        });
        resetForm();
        toast.success("Lead saved");
      } else {
        saveOfflineLead(ownerId, lead);
        setUnsyncedCount(getUnsyncedCount(ownerId));
        resetForm();
        toast.info("Saved offline. It'll sync automatically once you're back online.");
      }
    } catch (error) {
      // The lead is kept locally, but the user must know it didn't reach the
      // server, so this is a warning, not the plain success toast. If the
      // session ended mid-save, keep the form filled rather than lose it.
      const current = ownerRef.current;
      if (!current) {
        toast.error("You were signed out before this lead saved. Sign in again, then save it.");
        return;
      }
      saveOfflineLead(current, lead);
      setUnsyncedCount(getUnsyncedCount(current));
      resetForm();
      toast.warning(
        `Couldn't reach the server (${toUserMessage(error)}). Saved offline instead; it'll sync automatically.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    const result = await runSync(true);
    if (!result) return;
    // syncOfflineLeads catches per lead and never throws, so report both halves.
    if (result.synced > 0 && result.failed === 0) {
      toast.success(`Synced ${result.synced} lead${plural(result.synced)}`);
    } else if (result.synced > 0 && result.failed > 0) {
      toast.warning(
        `Synced ${result.synced} lead${plural(result.synced)}, but ${result.failed} failed and will retry automatically.`,
      );
    } else if (result.failed > 0) {
      toast.error(
        `Failed to sync ${result.failed} lead${plural(result.failed)}. They're still saved on this device and will retry automatically.`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!online ? (
              <>
                <WifiOff className="w-5 h-5 text-[var(--connecta-mark-text)]" />
                Offline Lead Capture
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5 text-primary" />
                Capture Lead
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {!online
              ? "Lead will be saved locally and synced when online."
              : "Add a new lead to your CRM."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Name *
            </label>
            <Input
              placeholder="e.g. Maria Santos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact *
            </label>
            <Input
              placeholder="Phone or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message (Optional)
            </label>
            <Textarea
              placeholder="Notes about this lead..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={saving || !ownerId}
            >
              {saving ? (
                "Saving..."
              ) : !ownerId ? (
                "Connecting..."
              ) : !online ? (
                <>
                  <WifiOff className="w-4 h-4 mr-2" />
                  Save Offline
                </>
              ) : (
                "Save Lead"
              )}
            </Button>

            {unsyncedCount > 0 && online && (
              <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
                <Upload className="w-4 h-4 mr-2" />
                Sync ({unsyncedCount})
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
