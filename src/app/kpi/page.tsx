"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KpiOverviewCard, DepartmentSummary } from "@/components/kpi/kpi-overview-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, RefreshCw, Search } from "lucide-react";


export default function KpiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/kpi/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch KPI departments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchDepartments();
    }
  }, [status, router, fetchDepartments]);

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregate stats
  const totalGreen = departments.reduce((s, d) => s + d.statusSummary.green, 0);
  const totalYellow = departments.reduce((s, d) => s + d.statusSummary.yellow, 0);
  const totalRed = departments.reduce((s, d) => s + d.statusSummary.red, 0);
  const totalGoals = departments.reduce((s, d) => s + d.totalGoals, 0);
  const totalTracked = departments.reduce((s, d) => s + d.goalsWithStatus, 0);

  const currentYear = new Date().getFullYear();

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading KPI Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">KPI Dashboard</h1>
            <p className="text-muted-foreground text-sm">{currentYear} · All Departments</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDepartments} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-center bg-card">
          <div className="text-3xl font-bold text-foreground">{departments.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Departments</div>
        </div>
        <div className="rounded-lg border p-4 text-center bg-green-50 border-green-200">
          <div className="text-3xl font-bold text-green-700">{totalGreen}</div>
          <div className="text-xs text-green-600 mt-1">Green Goals</div>
        </div>
        <div className="rounded-lg border p-4 text-center bg-yellow-50 border-yellow-200">
          <div className="text-3xl font-bold text-yellow-700">{totalYellow}</div>
          <div className="text-xs text-yellow-600 mt-1">Yellow Goals</div>
        </div>
        <div className="rounded-lg border p-4 text-center bg-red-50 border-red-200">
          <div className="text-3xl font-bold text-red-700">{totalRed}</div>
          <div className="text-xs text-red-600 mt-1">Red Goals</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="rounded-lg border p-4 bg-card space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Overall Goal Coverage ({currentYear})</span>
          <span className="font-semibold">
            {totalTracked} / {totalGoals} ({totalGoals > 0 ? Math.round((totalTracked / totalGoals) * 100) : 0}% tracked)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${totalGoals > 0 ? (totalTracked / totalGoals) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Department cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No departments found{search ? ` for "${search}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((dept) => (
            <KpiOverviewCard key={dept.id} department={dept} />
          ))}
        </div>
      )}

      {/* User context */}
      {session?.user && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Logged in as <span className="font-medium">{session.user.name || session.user.email}</span>
          {" · "}
          <span className="font-medium capitalize">{(session.user as { role?: string }).role || "User"}</span>
        </div>
      )}
    </div>
  );
}
