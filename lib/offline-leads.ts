// Offline Lead Capture Utility
// Stores leads in localStorage when offline, syncs when online

import { OFFLINE_LEADS_KEY, LEAD_VISITOR_ID_KEY } from "./storage-keys";
import { toUserMessage } from "./errors";

export interface OfflineLead {
  id: string;
  inquirerName: string;
  inquirerContact: string;
  message?: string;
  timestamp: number;
  synced: boolean;
}

/**
 * Save lead to localStorage when offline
 */
export function saveOfflineLead(lead: Omit<OfflineLead, "id" | "timestamp" | "synced">): OfflineLead {
  const offlineLead: OfflineLead = {
    ...lead,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    synced: false,
  };

  const existingLeads = getOfflineLeads();
  existingLeads.push(offlineLead);
  localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(existingLeads));

  console.log("Offline lead saved:", offlineLead.id);
  return offlineLead;
}

/**
 * Get all offline leads from localStorage
 */
export function getOfflineLeads(): OfflineLead[] {
  try {
    const stored = localStorage.getItem(OFFLINE_LEADS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse offline leads:", error);
    return [];
  }
}

/**
 * Mark a lead as synced
 */
export function markLeadSynced(leadId: string): void {
  const leads = getOfflineLeads();
  const updated = leads.map(lead => 
    lead.id === leadId ? { ...lead, synced: true } : lead
  );
  localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(updated));
}

/**
 * Remove synced leads from localStorage
 */
export function clearSyncedLeads(): void {
  const leads = getOfflineLeads();
  const unsynced = leads.filter(lead => !lead.synced);
  localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(unsynced));
}

/**
 * Get unsynced leads count
 */
export function getUnsyncedCount(): number {
  const leads = getOfflineLeads();
  return leads.filter(lead => !lead.synced).length;
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Get (or create) a per-browser visitor id, persisted in localStorage.
 *
 * Task 17 / I2: `createLead`'s rate limit (convex/leads.ts) used to be keyed
 * only on the profile owner, so every anonymous visitor to one profile
 * shared a single 5/min bucket — ten NFC taps in a minute from ten
 * different prospects throttled half of them. Passing this id lets the
 * server scope the cap per visitor instead. Same generation pattern as
 * CartContext.tsx's guest cart id: a random string, persisted once, reused
 * on every call from this browser. It is NOT an identity or auth token —
 * it's client-supplied and any caller can omit or rotate it, so the server
 * also keeps an aggregate per-owner ceiling as a backstop (see
 * convex/leads.ts's OWNER_AGGREGATE_MAX comment).
 */
export function getOrCreateLeadVisitorId(): string {
  if (typeof window === "undefined") return "";

  let visitorId = localStorage.getItem(LEAD_VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(LEAD_VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

/**
 * Sync offline leads to Convex
 */
import { Id } from "@/convex/_generated/dataModel";

export async function syncOfflineLeads(
  createLeadFn: (args: {
    ownerId: Id<"users">;
    inquirerName: string;
    inquirerContact: string;
    message?: string;
    visitorId?: string;
  }) => Promise<unknown>,
  ownerId: Id<"users">
): Promise<{ synced: number; failed: number; failures: string[] }> {
  const leads = getOfflineLeads().filter(lead => !lead.synced);

  if (leads.length === 0) {
    return { synced: 0, failed: 0, failures: [] };
  }

  console.log(`Syncing ${leads.length} offline leads...`);

  const visitorId = getOrCreateLeadVisitorId();
  let synced = 0;
  let failed = 0;
  // Task 17 / I2: the caller used to get back only `{synced, failed}` —
  // enough to count failures but never enough to say what happened, so the
  // only honest UI copy possible was a vague "N leads failed." Collecting
  // the actual per-lead reasons lets the sync toast name them.
  const failures: string[] = [];

  for (const lead of leads) {
    try {
      await createLeadFn({
        ownerId,
        inquirerName: lead.inquirerName,
        inquirerContact: lead.inquirerContact,
        message: lead.message,
        visitorId,
      });

      markLeadSynced(lead.id);
      synced++;
      console.log(`✓ Synced lead: ${lead.inquirerName}`);
    } catch (error) {
      failed++;
      // toUserMessage, not the raw error: a production deployment redacts
      // plain Error text (see lib/errors.ts), and a raw Convex transport
      // envelope in this toast would be worse than no detail at all.
      const reason = toUserMessage(error);
      failures.push(`${lead.inquirerName}: ${reason}`);
      console.error(`✗ Failed to sync lead ${lead.id}:`, error);
    }
  }

  // Clean up synced leads. Unsynced ones are deliberately left in place —
  // see markLeadSynced/clearSyncedLeads above — so a failed lead is retried
  // on the next sync instead of being lost.
  clearSyncedLeads();

  console.log(`Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed, failures };
}
