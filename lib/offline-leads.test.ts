import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  getOrCreateLeadVisitorId,
  getOfflineLeads,
  saveOfflineLead,
  syncOfflineLeads,
} from "./offline-leads";
import { LEAD_VISITOR_ID_KEY, OFFLINE_LEADS_KEY } from "./storage-keys";
import { Id } from "@/convex/_generated/dataModel";

// This project's test config runs plain `*.test.ts` files under
// `edge-runtime`, which — like Node itself without `--localstorage-file` —
// does not provide a working `localStorage` (confirmed: the global exists
// as `undefined`, distinct from jsdom's fuller polyfill used for
// `*.test.tsx`). offline-leads.ts is browser-only logic with no React
// component to render, so it belongs in a plain `.ts` file; this minimal
// in-memory stand-in is enough to exercise it without depending on Node/CLI
// flags or forcing a jsdom environment switch for one file. Installed
// before any test runs (module-level, below the imports it doesn't need to
// precede — offline-leads.ts only touches `localStorage` inside function
// bodies, never at import time).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}
Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

function clearStorage() {
  localStorage.removeItem(LEAD_VISITOR_ID_KEY);
  localStorage.removeItem(OFFLINE_LEADS_KEY);
}

beforeEach(clearStorage);
afterEach(clearStorage);

describe("getOrCreateLeadVisitorId", () => {
  test("persists the same id across calls, so one browser's submissions all key to one visitor bucket", () => {
    const first = getOrCreateLeadVisitorId();
    const second = getOrCreateLeadVisitorId();
    expect(first).toBe(second);
    expect(first).not.toBe("");
  });

  test("two independent browsers (cleared storage) get different ids", () => {
    const first = getOrCreateLeadVisitorId();
    clearStorage();
    const second = getOrCreateLeadVisitorId();
    expect(first).not.toBe(second);
  });
});

/**
 * Task 17 / I2's second half: `syncOfflineLeads` never lost data (a failed
 * lead stays unsynced and is retried next time — markLeadSynced is skipped
 * on failure, clearSyncedLeads only removes leads that succeeded), but the
 * caller had no honest way to report failures: it returned `{synced,
 * failed}` and never threw, so OfflineLeadCapture.tsx's toast only ever
 * read `result.synced` — "Synced 5 leads" while an equal number silently
 * didn't. These tests pin the fix: the failure count and per-lead reasons
 * must be visible in the result, and the retry-on-next-sync behavior must
 * survive the change.
 */
describe("syncOfflineLeads", () => {
  const ownerId = "owner_1" as Id<"users">;

  test("reports failed count and per-lead reasons instead of only ever reporting synced", async () => {
    saveOfflineLead({ inquirerName: "Wins A", inquirerContact: "a@test.dev" });
    saveOfflineLead({ inquirerName: "Fails B", inquirerContact: "b@test.dev" });
    saveOfflineLead({ inquirerName: "Wins C", inquirerContact: "c@test.dev" });

    const createLeadFn = async (args: { inquirerName: string }) => {
      if (args.inquirerName === "Fails B") {
        throw new Error("Too many requests. Please try again in a moment.");
      }
      return "lead_id";
    };

    const result = await syncOfflineLeads(createLeadFn, ownerId);

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("Fails B");
  });

  test("a failed lead is retried on the next sync — never silently dropped", async () => {
    saveOfflineLead({ inquirerName: "Retry Me", inquirerContact: "retry@test.dev" });

    let attempt = 0;
    const createLeadFn = async () => {
      attempt++;
      if (attempt === 1) throw new Error("Network error");
      return "lead_id";
    };

    const first = await syncOfflineLeads(createLeadFn, ownerId);
    expect(first.synced).toBe(0);
    expect(first.failed).toBe(1);
    // Still queued locally — not lost.
    expect(getOfflineLeads().filter((l) => !l.synced)).toHaveLength(1);

    const second = await syncOfflineLeads(createLeadFn, ownerId);
    expect(second.synced).toBe(1);
    expect(second.failed).toBe(0);
    expect(getOfflineLeads().filter((l) => !l.synced)).toHaveLength(0);
  });

  test("passes the same visitorId used for the browser's rate-limit bucket on every call in the batch", async () => {
    saveOfflineLead({ inquirerName: "One", inquirerContact: "one@test.dev" });
    saveOfflineLead({ inquirerName: "Two", inquirerContact: "two@test.dev" });

    const seenVisitorIds: (string | undefined)[] = [];
    const createLeadFn = async (args: { visitorId?: string }) => {
      seenVisitorIds.push(args.visitorId);
      return "lead_id";
    };

    await syncOfflineLeads(createLeadFn, ownerId);

    expect(seenVisitorIds).toHaveLength(2);
    expect(seenVisitorIds[0]).toBeTruthy();
    expect(seenVisitorIds[0]).toBe(seenVisitorIds[1]);
  });
});
