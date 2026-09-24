"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs, type AuditLogWithActor } from "@/hooks/useAdmin";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminAuditPage() {
  const { user, isLoaded } = useAuth();
  const [search, setSearch] = useState("");

  const { data: auditLogs } = useAuditLogs();

  if (!isLoaded || auditLogs === undefined) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  // Timestamps arrive as ISO 8601 strings from Postgres, not epoch millis.
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("grant"))
      return "bg-primary text-primary-foreground border-primary";
    if (
      action.includes("delete") ||
      action.includes("revoke") ||
      action.includes("suspend") ||
      action.includes("refund")
    )
      return "bg-destructive/10 text-destructive border-destructive/20";
    if (action.includes("update") || action.includes("reactivate"))
      return "bg-primary/10 text-primary border-primary/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const searchLower = search.trim().toLowerCase();
  const filtered = auditLogs.filter((log) => {
    if (!searchLower) return true;
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      (log.actorEmail || "").toLowerCase().includes(searchLower) ||
      (log.actorName || "").toLowerCase().includes(searchLower)
    );
  });

  const exportLogs = () => {
    if (!filtered.length) return;
    const headers = ["Timestamp", "Actor", "Email", "Action", "Resource Type", "Resource ID"];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.actorName || "",
      l.actorEmail || "",
      l.action,
      l.resource_type,
      l.resource_id,
    ]);
    const escape = (v: unknown) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Security events and platform activity tracking
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-card border-border text-foreground hover:bg-muted"
          onClick={exportLogs}
          disabled={!filtered.length}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search action, resource, or actor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Audit Table */}
      <Card className="bg-card border-border text-foreground">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 border-[1.5px] border-input flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">No audit entries</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Admin actions (product, order, discount, card, user, and settings changes) will
                appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-muted-foreground">Actor</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground">Resource</TableHead>
                  <TableHead className="text-muted-foreground">Resource ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {log.actorName || log.actorEmail || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{log.resource_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                      {log.resource_id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
