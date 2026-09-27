import type { Lead } from "@/hooks/useLeads";

export type LeadAction = "contacted" | "closed" | "reopen" | "delete";

/** The status moves a lead offers (B13, 2026-09-27). Delete is always there. */
export function leadStatusActions(status: Lead["status"]): LeadAction[] {
  if (status === "new") return ["contacted", "closed", "delete"];
  if (status === "contacted") return ["closed", "delete"];
  return ["reopen", "delete"];
}
