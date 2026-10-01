import { Building2, CreditCard, LayoutDashboard, MessageSquare, Settings, SmartphoneNfc, Users } from "lucide-react";

/**
 * The dashboard's sections, one name each (2026-10-01): the sidebar, the
 * phone top bar and each page's title read `title`; the phone bottom bar,
 * which has ~46px per item at 320px, reads `short`.
 */
export const DASHBOARD_SECTIONS = [
  { title: "Overview", short: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Profiles", short: "Profiles", url: "/dashboard/profiles", icon: Users },
  { title: "Leads", short: "Leads", url: "/dashboard/leads", icon: MessageSquare },
  { title: "NFC cards", short: "Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
  { title: "Team", short: "Team", url: "/dashboard/team", icon: Building2 },
  { title: "Billing", short: "Billing", url: "/dashboard/billing", icon: CreditCard },
  { title: "Settings", short: "Settings", url: "/dashboard/settings", icon: Settings },
] as const;

/** Focused tasks outside the section list. */
const TASK_TITLES: Record<string, string> = {
  "/dashboard/builder": "Profile builder",
  "/dashboard/onboarding": "Profile setup",
};

export function dashboardSectionTitle(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === "/dashboard") return "Overview";
  for (const [url, title] of Object.entries(TASK_TITLES)) {
    if (pathname.startsWith(url)) return title;
  }
  const section = DASHBOARD_SECTIONS.find((s) => s.url !== "/dashboard" && pathname.startsWith(s.url));
  return section?.title ?? null;
}

/**
 * The phone bottom navigation. B16 (2026-09-27): Team was only reachable
 * from the desktop sidebar. Billing stays in the sidebar and account menu.
 */
export const MOBILE_NAV = DASHBOARD_SECTIONS.filter((s) => s.url !== "/dashboard/billing").map((s) => ({
  title: s.short,
  url: s.url,
  icon: s.icon,
}));
