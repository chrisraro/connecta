// Offline Lead Capture Utility
// Stores leads in localStorage when offline, syncs when online.
//
// B4 (2026-09-25): each account has its own queue. There used to be one queue
// per browser, so leads captured offline by one account synced into whichever
// account signed in next on the same device. Every lead is also stamped with
// its owner, and a lead stamped for someone else is never sent.

import { OFFLINE_LEADS_KEY, LEAD_VISITOR_ID_KEY } from "./storage-keys";
import { toUserMessage } from "./errors";

export interface OfflineLead {
  id: string;
  ownerId: string;
  inquirerName: string;
  inquirerContact: string;
  message?: string;
  timestamp: number;
  synced: boolean;
  /** Failed sync attempts so far. */
  attempts?: number;
  /** Epoch ms before which the lead is not retried. */
  nextAttemptAt?: number;
}

type NewLead = Pick<OfflineLead, "inquirerName" | "inquirerContact" | "message">;

/** The queue key for one account. The bare OFFLINE_LEADS_KEY is the old shared queue. */
export function offlineLeadsKey(ownerId: string): string {
  return `${OFFLINE_LEADS_KEY}:${ownerId}`;
}

const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 60 * 60_000;

/** Wait before retry number `attempts`: 30 s, doubling, capped at an hour. */
export function retryDelayMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);
}

function readQueue(key: string): OfflineLead[] {
  try {
    const stored = localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as OfflineLead[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(ownerId: string, leads: OfflineLead[]): void {
  const key = offlineLeadsKey(ownerId);
  if (leads.length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(leads));
}

/** Queue a lead for one account. */
export function saveOfflineLead(ownerId: string, lead: NewLead): OfflineLead {
  if (!ownerId) throw new Error("A signed-in account is needed to save a lead.");
  const offlineLead: OfflineLead = {
    ...lead,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    ownerId,
    timestamp: Date.now(),
    synced: false,
  };
  writeQueue(ownerId, [...getOfflineLeads(ownerId), offlineLead]);
  return offlineLead;
}

/** One account's queued leads. Entries stamped for another owner are ignored. */
export function getOfflineLeads(ownerId: string): OfflineLead[] {
  if (!ownerId) return [];
  return readQueue(offlineLeadsKey(ownerId)).filter((lead) => lead.ownerId === ownerId);
}

export function getUnsyncedCount(ownerId: string): number {
  return getOfflineLeads(ownerId).filter((lead) => !lead.synced).length;
}

/** When the earliest waiting lead is due for a retry, or null if none is waiting. */
export function nextRetryAt(ownerId: string): number | null {
  const due = getOfflineLeads(ownerId)
    .filter((lead) => !lead.synced && lead.nextAttemptAt)
    .map((lead) => lead.nextAttemptAt as number);
  return due.length ? Math.min(...due) : null;
}

/** Check if browser is online */
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

export interface SyncResult {
  synced: number;
  /** Leads attempted this run that failed; they stay queued. */
  failed: number;
  /** Of those, how many failed for the first time (worth telling the user about). */
  newlyFailed: number;
  /** Leads skipped because their retry backoff hasn't passed. */
  deferred: number;
  failures: string[];
}

/**
 * Flush one account's queued leads to the server.
 *
 * Never throws: each lead is tried on its own, so one bad lead doesn't stop
 * the rest. A failed lead stays queued with an exponential backoff, so a
 * lead the server keeps rejecting can't be resent in a tight loop.
 * `ignoreBackoff` is for a sync the user asked for.
 */
export async function syncOfflineLeads(
  createLeadFn: (args: {
    owner_id: string;
    inquirer_name: string;
    inquirer_contact: string;
    message?: string | null;
  }) => Promise<unknown>,
  ownerId: string,
  now: number = Date.now(),
  { ignoreBackoff = false }: { ignoreBackoff?: boolean } = {},
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, newlyFailed: 0, deferred: 0, failures: [] };
  const leads = getOfflineLeads(ownerId);
  const outcome = new Map<string, OfflineLead | null>();

  for (const lead of leads) {
    if (lead.synced) continue;
    if (!ignoreBackoff && lead.nextAttemptAt && lead.nextAttemptAt > now) {
      result.deferred++;
      continue;
    }
    try {
      await createLeadFn({
        owner_id: ownerId,
        inquirer_name: lead.inquirerName,
        inquirer_contact: lead.inquirerContact,
        message: lead.message,
      });
      outcome.set(lead.id, null);
      result.synced++;
    } catch (error) {
      const attempts = (lead.attempts ?? 0) + 1;
      outcome.set(lead.id, { ...lead, attempts, nextAttemptAt: now + retryDelayMs(attempts) });
      result.failed++;
      if (attempts === 1) result.newlyFailed++;
      // toUserMessage, not the raw error: production redacts plain Error text
      // (see lib/errors.ts).
      result.failures.push(`${lead.inquirerName}: ${toUserMessage(error)}`);
    }
  }

  // Re-read so a lead queued while this sync was running isn't lost.
  const remaining = getOfflineLeads(ownerId).flatMap((lead) => {
    if (!outcome.has(lead.id)) return lead.synced ? [] : [lead];
    const next = outcome.get(lead.id);
    return next ? [next] : [];
  });
  writeQueue(ownerId, remaining);
  return result;
}

/** Unsynced leads left in the old shared queue, whose owner is unknown. */
export function getLegacyLeadCount(): number {
  return readQueue(OFFLINE_LEADS_KEY).filter((lead) => !lead.synced).length;
}

/** Move the old shared queue into one account's queue, on that account's say-so. */
export function adoptLegacyLeads(ownerId: string): number {
  if (!ownerId) return 0;
  const legacy = readQueue(OFFLINE_LEADS_KEY)
    .filter((lead) => !lead.synced)
    .map((lead) => ({ ...lead, ownerId, attempts: 0, nextAttemptAt: undefined }));
  writeQueue(ownerId, [...getOfflineLeads(ownerId), ...legacy]);
  localStorage.removeItem(OFFLINE_LEADS_KEY);
  return legacy.length;
}

export function discardLegacyLeads(): void {
  localStorage.removeItem(OFFLINE_LEADS_KEY);
}

/**
 * First names in the old shared queue, so the import prompt can show whose
 * leads they are without exposing contact details.
 */
export function getLegacyLeadNames(): string[] {
  return readQueue(OFFLINE_LEADS_KEY)
    .filter((lead) => !lead.synced)
    .map((lead) => String(lead.inquirerName ?? "").trim().split(/\s+/)[0] || "Unnamed");
}

/**
 * Drop one account's queue. Called when the account is deleted: queued
 * leads hold visitors' names and numbers (RA 10173), and must not outlive
 * the account in this browser.
 */
export function clearOfflineLeads(ownerId: string): void {
  if (ownerId) localStorage.removeItem(offlineLeadsKey(ownerId));
}
