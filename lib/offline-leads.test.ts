import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  adoptLegacyLeads,
  clearOfflineLeads,
  discardLegacyLeads,
  getLegacyLeadCount,
  getLegacyLeadNames,
  getOrCreateLeadVisitorId,
  getOfflineLeads,
  getUnsyncedCount,
  nextRetryAt,
  offlineLeadsKey,
  retryDelayMs,
  saveOfflineLead,
  syncOfflineLeads,
} from "./offline-leads";
import { OFFLINE_LEADS_KEY } from "./storage-keys";

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
  localStorage.clear();
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

const T0 = 1_790_000_000_000;

/**
 * Task 17 / I2: `syncOfflineLeads` never throws, so the result must carry the
 * failure count and per-lead reasons, and a failed lead must stay queued.
 */
describe("syncOfflineLeads", () => {
  const ownerId = "owner_1";

  test("reports failed count and per-lead reasons instead of only ever reporting synced", async () => {
    saveOfflineLead(ownerId, { inquirerName: "Wins A", inquirerContact: "a@test.dev" });
    saveOfflineLead(ownerId, { inquirerName: "Fails B", inquirerContact: "b@test.dev" });
    saveOfflineLead(ownerId, { inquirerName: "Wins C", inquirerContact: "c@test.dev" });

    const createLeadFn = async (args: { inquirer_name: string }) => {
      if (args.inquirer_name === "Fails B") {
        throw new Error("Too many requests. Please try again in a moment.");
      }
      return "lead_id";
    };

    const result = await syncOfflineLeads(createLeadFn, ownerId, T0);

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("Fails B");
  });

  test("a failed lead stays queued and is retried once its backoff has passed", async () => {
    saveOfflineLead(ownerId, { inquirerName: "Retry Me", inquirerContact: "retry@test.dev" });

    let attempt = 0;
    const createLeadFn = async () => {
      attempt++;
      if (attempt === 1) throw new Error("Network error");
      return "lead_id";
    };

    const first = await syncOfflineLeads(createLeadFn, ownerId, T0);
    expect(first).toMatchObject({ synced: 0, failed: 1 });
    expect(getUnsyncedCount(ownerId)).toBe(1);

    const second = await syncOfflineLeads(createLeadFn, ownerId, T0 + retryDelayMs(1));
    expect(second).toMatchObject({ synced: 1, failed: 0 });
    expect(getUnsyncedCount(ownerId)).toBe(0);
  });

  test("sends every queued lead to the owner, in the row shape the table uses", async () => {
    saveOfflineLead(ownerId, { inquirerName: "One", inquirerContact: "one@test.dev", message: "hi" });
    saveOfflineLead(ownerId, { inquirerName: "Two", inquirerContact: "two@test.dev" });

    const seen: { owner_id: string; inquirer_name: string; inquirer_contact: string }[] = [];
    const createLeadFn = async (args: { owner_id: string; inquirer_name: string; inquirer_contact: string }) => {
      seen.push(args);
      return "lead_id";
    };

    await syncOfflineLeads(createLeadFn, ownerId, T0);

    expect(seen).toHaveLength(2);
    expect(seen.every((a) => a.owner_id === ownerId)).toBe(true);
    expect(seen.map((a) => a.inquirer_name).sort()).toEqual(["One", "Two"]);
  });
});

/**
 * B4 (backlog 2026-09-25): one browser queue was shared by every account, so
 * leads captured offline by one account synced into whichever account signed
 * in next on that device.
 */
describe("per-account queues", () => {
  test("each account only sees and syncs its own leads", async () => {
    saveOfflineLead("agent_a", { inquirerName: "Lead for A", inquirerContact: "a@test.dev" });
    saveOfflineLead("agent_b", { inquirerName: "Lead for B", inquirerContact: "b@test.dev" });

    expect(getOfflineLeads("agent_a").map((l) => l.inquirerName)).toEqual(["Lead for A"]);
    expect(getUnsyncedCount("agent_b")).toBe(1);

    const seen: string[] = [];
    await syncOfflineLeads(
      async (args: { owner_id: string; inquirer_name: string }) => {
        seen.push(`${args.owner_id}:${args.inquirer_name}`);
        return "id";
      },
      "agent_b",
      T0,
    );

    expect(seen).toEqual(["agent_b:Lead for B"]);
    expect(getUnsyncedCount("agent_a")).toBe(1);
  });

  test("a lead stamped with another owner is never sent, even if it lands in the wrong key", async () => {
    localStorage.setItem(
      offlineLeadsKey("agent_b"),
      JSON.stringify([
        { id: "x", ownerId: "agent_a", inquirerName: "Planted", inquirerContact: "p", timestamp: T0, synced: false },
      ]),
    );
    const seen: string[] = [];
    await syncOfflineLeads(
      async (args: { inquirer_name: string }) => {
        seen.push(args.inquirer_name);
        return "id";
      },
      "agent_b",
      T0,
    );
    expect(seen).toEqual([]);
  });

  test("needs an owner to save", () => {
    expect(() => saveOfflineLead("", { inquirerName: "N", inquirerContact: "c" })).toThrow();
  });
});

/** B4: a failing lead used to re-sync in a tight loop with a toast each time. */
describe("retry backoff", () => {
  test("delays double from 30 seconds and cap at an hour", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(20)).toBe(3_600_000);
  });

  test("a failed lead is not retried before its backoff passes", async () => {
    saveOfflineLead("o", { inquirerName: "Flaky", inquirerContact: "f" });
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error("down");
    };

    await syncOfflineLeads(failing, "o", T0);
    const again = await syncOfflineLeads(failing, "o", T0 + 1_000);

    expect(calls).toBe(1);
    expect(again).toMatchObject({ synced: 0, failed: 0, deferred: 1 });
    expect(nextRetryAt("o")).toBe(T0 + 30_000);
  });

  test("reports only first-time failures as new, so retries don't toast again", async () => {
    saveOfflineLead("o", { inquirerName: "Flaky", inquirerContact: "f" });
    const failing = async () => {
      throw new Error("down");
    };
    const first = await syncOfflineLeads(failing, "o", T0);
    const second = await syncOfflineLeads(failing, "o", T0 + retryDelayMs(1));
    expect(first.newlyFailed).toBe(1);
    expect(second.newlyFailed).toBe(0);
    expect(second.failed).toBe(1);
  });

  test("a manual sync retries now, ignoring the backoff", async () => {
    saveOfflineLead("o", { inquirerName: "Flaky", inquirerContact: "f" });
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls === 1) throw new Error("down");
      return "id";
    };
    await syncOfflineLeads(flaky, "o", T0);
    const manual = await syncOfflineLeads(flaky, "o", T0 + 1_000, { ignoreBackoff: true });
    expect(manual).toMatchObject({ synced: 1, deferred: 0 });
    expect(getUnsyncedCount("o")).toBe(0);
  });

  test("nextRetryAt is null when nothing is waiting", () => {
    expect(nextRetryAt("nobody")).toBeNull();
  });
});

/** B4: leads in the old shared queue have no known owner; import only on request. */
describe("legacy shared queue", () => {
  const legacy = [
    { id: "l1", inquirerName: "Old One", inquirerContact: "1", timestamp: T0, synced: false },
    { id: "l2", inquirerName: "Old Two", inquirerContact: "2", timestamp: T0, synced: false },
    { id: "l3", inquirerName: "Done", inquirerContact: "3", timestamp: T0, synced: true },
  ];

  test("counts unsynced leads left in the old key without touching them", () => {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(legacy));
    expect(getLegacyLeadCount()).toBe(2);
    expect(localStorage.getItem(OFFLINE_LEADS_KEY)).not.toBeNull();
    expect(getUnsyncedCount("agent_a")).toBe(0);
  });

  test("adopting moves them into the account's queue and clears the old key", () => {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(legacy));
    expect(adoptLegacyLeads("agent_a")).toBe(2);
    expect(getOfflineLeads("agent_a").map((l) => [l.inquirerName, l.ownerId])).toEqual([
      ["Old One", "agent_a"],
      ["Old Two", "agent_a"],
    ]);
    expect(localStorage.getItem(OFFLINE_LEADS_KEY)).toBeNull();
    expect(getLegacyLeadCount()).toBe(0);
  });

  test("discarding removes the old key only", () => {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(legacy));
    saveOfflineLead("agent_a", { inquirerName: "Mine", inquirerContact: "m" });
    discardLegacyLeads();
    expect(getLegacyLeadCount()).toBe(0);
    expect(getUnsyncedCount("agent_a")).toBe(1);
  });

  test("previews who the old leads are, by first name only", () => {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(legacy));
    expect(getLegacyLeadNames()).toEqual(["Old", "Old"]);
  });

  test("a corrupt old queue counts as empty", () => {
    localStorage.setItem(OFFLINE_LEADS_KEY, "{not json");
    expect(getLegacyLeadCount()).toBe(0);
  });
});

/** B4 security review: deleting an account must not leave visitors' details in the browser. */
describe("clearOfflineLeads", () => {
  test("removes one account's queue and nothing else", () => {
    saveOfflineLead("gone", { inquirerName: "Visitor", inquirerContact: "0917" });
    saveOfflineLead("stays", { inquirerName: "Other", inquirerContact: "0918" });
    clearOfflineLeads("gone");
    expect(localStorage.getItem(offlineLeadsKey("gone"))).toBeNull();
    expect(getUnsyncedCount("stays")).toBe(1);
  });
});
