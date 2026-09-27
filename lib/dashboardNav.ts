import { Building2, LayoutDashboard, MessageSquare, Settings, SmartphoneNfc, Users } from "lucide-react";

/**
 * The phone bottom navigation. B16 (2026-09-27): Team was only reachable
 * from the desktop sidebar.
 */
export const MOBILE_NAV = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Profiles", url: "/dashboard/profiles", icon: Users },
  { title: "Leads", url: "/dashboard/leads", icon: MessageSquare },
  { title: "Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
  { title: "Team", url: "/dashboard/team", icon: Building2 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
] as const;
