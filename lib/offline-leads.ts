// Offline Lead Capture Utility
// Stores leads in localStorage when offline, syncs when online

export interface OfflineLead {
  id: string;
  inquirerName: string;
  inquirerContact: string;
  message?: string;
  timestamp: number;
  synced: boolean;
}

const OFFLINE_LEADS_KEY = "tapfolio_offline_leads";

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
 * Sync offline leads to Convex
 */
export async function syncOfflineLeads(
  createLeadFn: (args: {
    ownerId: any;
    inquirerName: string;
    inquirerContact: string;
    message?: string;
  }) => Promise<any>,
  ownerId: any
): Promise<{ synced: number; failed: number }> {
  const leads = getOfflineLeads().filter(lead => !lead.synced);
  
  if (leads.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`Syncing ${leads.length} offline leads...`);

  let synced = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      await createLeadFn({
        ownerId,
        inquirerName: lead.inquirerName,
        inquirerContact: lead.inquirerContact,
        message: lead.message,
      });

      markLeadSynced(lead.id);
      synced++;
      console.log(`✓ Synced lead: ${lead.inquirerName}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to sync lead ${lead.id}:`, error);
    }
  }

  // Clean up synced leads
  clearSyncedLeads();

  console.log(`Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}
