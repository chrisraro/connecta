"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAdminStats, useAdminGrants } from "@/hooks/useAdmin";
import {
  Users,
  CreditCard,
  Activity,
  Loader2,
  Warehouse,
  ChevronRight,
  Shield,
  Settings,
  AlertTriangle,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { adminRoleLabel } from "@/lib/adminRoles";

export default function AdminDashboardPage() {
  const { user, isLoaded } = useAuth();
  const { data: appUser } = useCurrentUser();
  const { data: stats } = useAdminStats();
  const { data: grants } = useAdminGrants();

  // The caller's own grant, so the badge shows superadmin vs moderator.
  const myRole = grants?.find((g) => g.user_id === user?.id)?.role ?? "admin";

  if (!isLoaded || !stats) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {appUser?.name || user?.email}</p>
        </div>
        <Badge variant="outline" className="bg-transparent text-[var(--connecta-mark-text)] border-[var(--connecta-mark)] gap-1">
          <Shield className="w-3 h-3" />
          {adminRoleLabel(myRole)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-[1.5px] border-[1.5px] border-input bg-input sm:grid-cols-3 lg:grid-cols-6">
        <StatCell label="Total users" value={stats.totalUsers} icon={Users} />
        <StatCell label="Active NFC cards" value={stats.activeCards} icon={CreditCard} color="text-primary" />
        <StatCell label="Profiles" value={stats.totalProfiles} icon={UserCircle} />
        <StatCell
          label="Inventory cards"
          value={stats.inventoryCards}
          icon={Warehouse}
          color="text-[var(--connecta-mark-text)]"
        />
        <StatCell
          label="Low stock"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 ? "text-destructive" : undefined}
        />
        <StatCell label="New leads (7d)" value={stats.newLeads7d} icon={Activity} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Quick actions</h2>
        <div className="border-[1.5px] border-input">
          <QuickActionRow
            href="/admin/users"
            icon={Users}
            label="User management"
            description="Manage user accounts, roles, and permissions"
          />
          <QuickActionRow
            href="/admin/factory"
            icon={CreditCard}
            label="NFC factory"
            description="Register cards, scan NFC, and manage inventory"
          />
          <QuickActionRow
            href="/admin/audit"
            icon={Shield}
            label="Audit logs"
            description="Track all platform actions and security events"
          />
          <QuickActionRow
            href="/admin/settings"
            icon={Settings}
            label="Settings"
            description="Configure platform settings and integrations"
            last
          />
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold ${color ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function QuickActionRow({
  href,
  icon: Icon,
  label,
  description,
  last,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 bg-background p-4 transition-colors hover:bg-accent/40 ${last ? "" : "border-b-[1.5px] border-input"}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
