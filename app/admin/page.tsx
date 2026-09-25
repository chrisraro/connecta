"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAdminStats, useAdminGrants } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CreditCard,
  Activity,
  Loader2,
  Warehouse,
  ArrowRight,
  Shield,
  Settings,
  AlertTriangle,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active NFC Cards
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.activeCards}</div>
            <p className="text-xs text-muted-foreground mt-1">Paired by users</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profiles</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProfiles}</div>
            <p className="text-xs text-muted-foreground mt-1">Published portfolios</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Cards
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--connecta-mark-text)]">{stats.inventoryCards}</div>
            <p className="text-xs text-muted-foreground mt-1">Unassigned blanks</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={"text-3xl font-bold " + (stats.lowStockCount > 0 ? "text-destructive" : "")}
            >
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Products need restock</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Leads (7d)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.newLeads7d}</div>
            <p className="text-xs text-muted-foreground mt-1">of {stats.totalLeads} total</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/users">
            <Card className="bg-card border-border text-foreground hover:border-primary/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage user accounts, roles, and permissions
                </p>
                <Button className="w-full">
                  View Users
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/factory">
            <Card className="bg-card border-border text-foreground hover:border-primary/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">NFC Factory</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Register cards, scan NFC, and manage inventory
                </p>
                <Button className="w-full">
                  Manage Cards
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/audit">
            <Card className="bg-card border-border text-foreground hover:border-[var(--connecta-mark-text)]/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[var(--connecta-mark)]/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[var(--connecta-mark-text)]" />
                  </div>
                  <CardTitle className="text-lg">Audit Logs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track all platform actions and security events
                </p>
                <Button className="w-full">
                  View Logs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="bg-card border-border text-foreground hover:border-border transition-all hover:shadow-gray-500/10 cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-muted-foreground/10 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure platform settings and integrations
                </p>
                <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground group-hover:translate-x-1 transition-transform">
                  Open Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
