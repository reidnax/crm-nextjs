"use client";

/**
 * Admin Audit Logs Page
 * View and manage system audit logs
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleGate } from "@/components/auth/RoleGate";
import { Filter, Download, Search, User, Shield, Activity } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  permission?: string;
  oldValue?: any;
  newValue?: any;
  changedBy?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  changedByUser?: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
}

const actionColors: Record<string, string> = {
  granted: "bg-green-100 text-green-700",
  revoked: "bg-red-100 text-red-700",
  role_changed: "bg-blue-100 text-blue-700",
  login: "bg-gray-100 text-gray-700",
  logout: "bg-gray-100 text-gray-700",
  login_failed: "bg-orange-100 text-orange-700",
  resource_access: "bg-purple-100 text-purple-700",
  resource_created: "bg-emerald-100 text-emerald-700",
  resource_updated: "bg-yellow-100 text-yellow-700",
  resource_deleted: "bg-red-100 text-red-700",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "all",
    userId: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value && value !== "all") acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch audit statistics
   */
  const fetchAuditStats = async () => {
    try {
      const response = await fetch("/api/admin/audit-stats");

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error("Error fetching audit stats:", error);
    }
  };

  /**
   * Export audit logs
   */
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await fetch(`/api/admin/audit-logs/export?${params}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting audit logs:", error);
    }
  };

  /**
   * Format action display
   */
  const formatAction = (action: string): string => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  /**
   * Format log value for display
   */
  const formatLogValue = (value: any): string => {
    if (!value) return "-";

    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;

      if (typeof parsed === "object") {
        return Object.entries(parsed)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
      }

      return String(parsed);
    } catch {
      return String(value);
    }
  };

  // Fetch data on component mount and filter changes
  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchAuditStats();
  }, []);

  return (
    <RoleGate
      roles={["Admin", "Admin-Dev"]}
      fallback={
        <div className="p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Access Denied
                </h3>
                <p className="text-gray-600">
                  You don&apos;t have permission to view audit logs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">
              System activity and permission changes
            </p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([action, count]) => (
            <Card key={action}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {formatAction(action)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>

              <Select
                value={filters.action}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, action: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.keys(actionColors).map((action) => (
                    <SelectItem key={action} value={action}>
                      {formatAction(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />

              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />

              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    action: "",
                    userId: "",
                    startDate: "",
                    endDate: "",
                    search: "",
                  })
                }
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Showing {logs.length} of {pagination.total} logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading audit logs...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(
                            new Date(log.createdAt),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">
                                {log.user.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              actionColors[log.action] ||
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.permission || "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {log.newValue ? formatLogValue(log.newValue) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.changedByUser ? (
                            <div>
                              <div className="font-medium">
                                {log.changedByUser.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.changedByUser.email}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      pagination.page * pagination.limit >= pagination.total
                    }
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
