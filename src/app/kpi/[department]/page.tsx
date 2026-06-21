"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiSplitView } from "@/components/kpi/kpi-split-view";
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Circle,
} from "lucide-react";

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

function buildYearOptions(): string[] {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1].map(String);
}

interface DepartmentInfo {
  id: number;
  key: string;
  name: string;
  description: string | null;
}

interface Stats {
  total: number;
  green: number;
  yellow: number;
  red: number;
}

// ─── stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  colorClass,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${colorClass}`}
    >
      <span className="shrink-0">{icon}</span>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-[10px] font-medium mt-0.5 opacity-80 uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function KpiDepartmentPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const departmentKey = params.department as string;

  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [department, setDepartment] = useState<DepartmentInfo | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    green: 0,
    yellow: 0,
    red: 0,
  });

  const userRole = (session?.user as { role?: string })?.role || "";
  const isElevated = ELEVATED_ROLES.includes(userRole);
  const isOwnDept = userDepartment === departmentKey;
  const canEdit = isElevated || isOwnDept;

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const json = await res.json();
        setUserDepartment(json.data?.department || null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDepartment = useCallback(async () => {
    try {
      const res = await fetch("/api/kpi/departments");
      if (res.ok) {
        const json = await res.json();
        const depts: DepartmentInfo[] = json.data ?? [];
        setDepartment(depts.find((d) => d.key === departmentKey) ?? null);
      }
    } catch {
      /* ignore */
    }
  }, [departmentKey]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      setLoading(true);
      Promise.all([fetchUserProfile(), fetchDepartment()]).finally(() =>
        setLoading(false),
      );
    }
  }, [authStatus, router, fetchUserProfile, fetchDepartment]);

  const pending = stats.total - stats.green - stats.yellow - stats.red;

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/kpi")}
          className="h-9 w-9 shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold truncate">
              {department?.name || departmentKey}
            </h1>
            {canEdit ? (
              <Badge className="text-xs bg-green-100 text-green-700 border border-green-200 shrink-0">
                Can Edit
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 text-xs text-muted-foreground shrink-0"
              >
                <Lock className="h-3 w-3" />
                View Only
              </Badge>
            )}
          </div>
          {department?.description && (
            <p className="text-sm text-muted-foreground mt-0.5 ml-9">
              {department.description}
            </p>
          )}
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1 shrink-0 rounded-lg border bg-muted/40 p-0.5">
          {buildYearOptions().map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={`h-8 px-3 text-sm rounded-md font-medium transition-colors ${
                selectedYear === y
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            value={stats.green}
            label="On Track"
            colorClass="bg-green-50 border-green-200 text-green-800"
          />
          <StatPill
            icon={<AlertCircle className="h-5 w-5 text-yellow-600" />}
            value={stats.yellow}
            label="At Risk"
            colorClass="bg-yellow-50 border-yellow-200 text-yellow-800"
          />
          <StatPill
            icon={<XCircle className="h-5 w-5 text-red-600" />}
            value={stats.red}
            label="Off Track"
            colorClass="bg-red-50 border-red-200 text-red-800"
          />
          <StatPill
            icon={<Circle className="h-5 w-5 text-gray-400" />}
            value={pending}
            label="Pending"
            colorClass="bg-gray-50 border-gray-200 text-gray-700"
          />
        </div>
      )}

      {/* ── Split view ──────────────────────────────────────────────────── */}
      <KpiSplitView
        departmentKey={departmentKey}
        year={selectedYear}
        canEdit={canEdit}
        onStatsChange={setStats}
      />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center pb-2 border-t pt-3">
        KPI goals for <strong>{department?.name || departmentKey}</strong> ·{" "}
        {selectedYear} ·{" "}
        {canEdit
          ? "You can create and edit goals for this department."
          : "Contact your department head to manage goals."}
      </p>
    </div>
  );
}
