"use client";

import { useState, useEffect } from "react";
import { User, Mail, MessageSquare, Wifi, WifiOff, Upload } from "lucide-react";
import {
  saveOfflineLead,
  getUnsyncedCount,
  isOnline,
  syncOfflineLeads,
  getOrCreateLeadVisitorId,
} from "@/lib/offline-leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

export function OfflineLeadCapture({
  open,
  onOpenChange,
  onUnsyncedCountChange,
}: OfflineLeadCaptureProps) {
  // createLead is a Convex action (not a mutation) — see convex/leads.ts.
  // useAction has the same calling convention as useMutation, so
  // syncOfflineLeads's usage below is unaffected.
  const createLead = useAction(api.leads.createLead);
  const currentUser = useQuery(api.users.getUser);

  const [online, setOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    setUnsyncedCount(getUnsyncedCount());

    const handleOnline = () => {
      setOnline(true);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    onUnsyncedCountChange?.(unsyncedCount);
  }, [unsyncedCount, onUnsyncedCountChange]);

  // Auto-sync when currentUser loads and we have unsynced leads online
  useEffect(() => {
    if (online && currentUser && getUnsyncedCount() > 0 && !syncing) {
      const autoSync = async () => {
        setSyncing(true);
        try {
          const result = await syncOfflineLeads(createLead, currentUser._id);
          setUnsyncedCount(getUnsyncedCount());
          console.log(`Auto-synced ${result.synced} offline leads.`);
          // Task 17 / I2: syncOfflineLeads never throws — it
          // catches per-lead so one bad lead doesn't stop the rest
          // of the batch — so a partial failure must be surfaced
          // here, not assumed to show up in the catch block below.
          if (result.failed > 0) {
            toast.warning(
              `${result.failed} offline lead${result.failed === 1 ? "" : "s"} failed to sync and will retry automatically.`,
            );
          }
        } catch (error) {
          console.error("Auto-sync failed:", error);
          toast.error("Some leads failed to sync. They'll retry the next time you're online.");
        } finally {
          setSyncing(false);
        }
      };
      autoSync();
    }
  }, [online, currentUser, syncing, createLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (online && currentUser) {
        // Online: save directly to Convex
        await createLead({
          ownerId: currentUser._id,
          inquirerName: name,
          inquirerContact: contact,
          message: message || undefined,
          visitorId: getOrCreateLeadVisitorId(),
        });

        // Reset form
        setName("");
        setContact("");
        setMessage("");
        onOpenChange(false);
        toast.success("Lead saved");
      } else {
        // Offline: save to localStorage
        saveOfflineLead({
          inquirerName: name,
          inquirerContact: contact,
          message: message || undefined,
        });

        setUnsyncedCount(getUnsyncedCount());

        // Reset form
        setName("");
        setContact("");
        setMessage("");
        onOpenChange(false);
        toast.info("Saved offline — it'll sync automatically once you're back online.");
      }
    } catch (error) {
      console.error("Failed to save lead:", error);
      // Fallback to offline storage. This used to close the dialog
      // silently here too, making an online-save failure look
      // identical to a successful save — the lead WAS captured
      // locally, but the user has no way to know it didn't reach the
      // server, so a distinct warning (not the plain success toast
      // above) is the whole point of this branch.
      saveOfflineLead({
        inquirerName: name,
        inquirerContact: contact,
        message: message || undefined,
      });
      setUnsyncedCount(getUnsyncedCount());
      onOpenChange(false);
      toast.warning(
        `Couldn't reach the server (${toUserMessage(error)}) — saved offline instead. It'll sync automatically.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!currentUser) return;

    setSyncing(true);
    try {
      const result = await syncOfflineLeads(createLead, currentUser._id);
      setUnsyncedCount(getUnsyncedCount());

      // Task 17 / I2 fix: this used to report ONLY result.synced —
      // "Synced 5 leads" while an equal number silently failed and
      // stayed queued, because syncOfflineLeads catches per-lead and
      // never throws (so the catch block below could never fire for a
      // partial failure). Report both halves honestly; failed leads
      // remain queued and are retried on the next sync.
      if (result.synced > 0 && result.failed === 0) {
        toast.success(`Synced ${result.synced} lead${result.synced === 1 ? "" : "s"}`);
      } else if (result.synced > 0 && result.failed > 0) {
        toast.warning(
          `Synced ${result.synced} lead${result.synced === 1 ? "" : "s"}, but ${result.failed} failed and will retry automatically.`,
        );
      } else if (result.failed > 0) {
        toast.error(
          `Failed to sync ${result.failed} lead${result.failed === 1 ? "" : "s"}. They're still saved locally and will retry automatically.`,
        );
      }
    } catch (error) {
      console.error("Failed to sync leads:", error);
      toast.error(
        "Failed to sync leads. They will be synced automatically when connection is restored.",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!online ? (
              <>
                <WifiOff className="w-5 h-5 text-orange-500" />
                Offline Lead Capture
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
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
              disabled={saving || (online && currentUser === undefined)}
            >
              {saving ? (
                "Saving..."
              ) : currentUser === undefined && online ? (
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
