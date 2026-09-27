/**
 * Pure decisions for the Team page and the pending-invite banner.
 *
 * Kept out of app/dashboard/team/page.tsx and components/team/InviteBanner.tsx
 * so seat math and view selection can be unit-tested without mounting React,
 * a QueryClient, or a Supabase client. Every check here is cosmetic --
 * team_invite_member re-validates seats and membership server-side, and
 * effective_plan() re-validates the plan gate -- these functions only decide
 * what the UI shows while that happens.
 */

import type { PlanId } from "@/lib/plans";
import { CONNECTA } from "@/lib/brand";

export type SeatUsage = { used: number; total: number };

/** 0-100, clamped both ends so an over-capacity team never renders past full. */
export function seatUsagePercent(seatUsage: SeatUsage): number {
  if (seatUsage.total <= 0) return 0;
  return Math.min(100, Math.max(0, (seatUsage.used / seatUsage.total) * 100));
}

/** Never negative, even if seats were reduced below the current member count. */
export function seatsRemaining(seatUsage: SeatUsage): number {
  return Math.max(0, seatUsage.total - seatUsage.used);
}

export function canInviteMore(seatUsage: SeatUsage): boolean {
  return seatsRemaining(seatUsage) > 0;
}

export type TeamGate = "loading" | "upgrade" | "active";

/**
 * Which shell the Team page renders. `data` is useMyTeam()'s result:
 * `undefined` while the query is in flight, `null` when signed out or the
 * caller has no plan row at all.
 *
 * Gated on `plan`, which is the caller's EFFECTIVE plan (effective_plan(),
 * already folded team-membership inheritance into it) -- never the raw
 * stored plan -- and additionally on a `team` actually being present, so a
 * data inconsistency (teams plan, no team row) fails to the honest upgrade
 * prompt rather than rendering a member/owner view with nothing to show.
 */
export function teamGateFor(
  data: { plan: PlanId; team: unknown } | null | undefined,
): TeamGate {
  if (data === undefined) return "loading";
  if (data === null || data.plan !== "teams" || data.team === null) return "upgrade";
  return "active";
}

/** The owner has no disband flow here, so only a member can leave. */
export function canLeaveTeam(isOwner: boolean): boolean {
  return !isOwner;
}

/** The pending-invite banner's one sentence. */
export function inviteBannerText(invite: { ownerName: string; teamName: string }): string {
  return `${invite.ownerName} invited you to join ${invite.teamName} on ${CONNECTA.name}`;
}
