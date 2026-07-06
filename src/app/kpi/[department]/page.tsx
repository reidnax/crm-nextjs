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

// ─── stat card (matches dashboard top stats exactly) ─────────────────────────

function StatCard({
  icon,
  value,
  label,
  pct,
  iconBg,
  valueCls,
  borderCls,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  pct: number;
  iconBg: string;
  valueCls: string;
  borderCls: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${borderCls} bg-card px-5 py-4`}>
      <div className={`p-2 rounded-full ${iconBg} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-2xl font-bold leading-none ${valueCls}`}>{value}</div>
        <div className="text-[11px] font-semibold mt-1 uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-muted-foreground">{pct}%</div>
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
  const [stats, setStats] = useState<Stats>({ total: 0, green: 0, yellow: 0, red: 0 });

  const userRole = (session?.user as { role?: string })?.role || "";
  const isElevated = ELEVATED_ROLES.includes(userRole);
  const isOwnDept = userDepartment === departmentKey;
  const canEdit = isElevated || isOwnDept;

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) { const json = await res.json(); setUserDepartment(json.data?.department || null); }
    } catch { /* ignore */ }
  }, []);

  const fetchDepartment = useCallback(async () => {
    try {
      const res = await fetch("/api/kpi/departments");
      if (res.ok) {
        const json = await res.json();
        const depts: DepartmentInfo[] = json.data ?? [];
        setDepartment(depts.find((d) => d.key === departmentKey) ?? null);
      }
    } catch { /* ignore */ }
  }, [departmentKey]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") {
      setLoading(true);
      Promise.all([fetchUserProfile(), fetchDepartment()]).finally(() => setLoading(false));
    }
  }, [authStatus, router, fetchUserProfile, fetchDepartment]);

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

  const total = stats.total;
  const safeTotal = total || 1; // avoid divide-by-zero; percentages show 0% when total=0
  const pending = Math.max(0, total - stats.green - stats.yellow - stats.red);

  return (
    <div className="space-y-5">
      {/* ── Header — matches dashboard style ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/kpi")} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{department?.name || departmentKey}</h1>
              {canEdit ? (
                <Badge className="text-xs bg-green-100 text-green-700 border border-green-200 shrink-0 font-medium">
                  Can Edit
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground shrink-0">
                  <Lock className="h-3 w-3" /> View Only
                </Badge>
              )}
            </div>
            {department?.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{department.description}</p>
            )}
          </div>
        </div>

        {/* Right: year buttons + filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
            {buildYearOptions().map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`h-8 px-3 text-sm rounded-md font-semibold transition-colors ${
                  selectedYear === y
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats bar — 4 cards like dashboard ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          value={stats.green}
          label="On Track"
          pct={total === 0 ? 0 : Math.round((stats.green / safeTotal) * 100)}
          iconBg="bg-emerald-50"
          valueCls="text-emerald-600"
          borderCls="border-emerald-100"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          value={stats.yellow}
          label="At Risk"
          pct={total === 0 ? 0 : Math.round((stats.yellow / safeTotal) * 100)}
          iconBg="bg-amber-50"
          valueCls="text-amber-600"
          borderCls="border-amber-100"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          value={stats.red}
          label="Off Track"
          pct={total === 0 ? 0 : Math.round((stats.red / safeTotal) * 100)}
          iconBg="bg-red-50"
          valueCls="text-red-600"
          borderCls="border-red-100"
        />
        <StatCard
          icon={<Circle className="h-5 w-5 text-blue-500" />}
          value={pending}
          label="Pending"
          pct={total === 0 ? 0 : Math.round((pending / safeTotal) * 100)}
          iconBg="bg-blue-50"
          valueCls="text-blue-600"
          borderCls="border-blue-100"
        />
      </div>

      {/* ── Dashboard view ─────────────────────────────────────────────────── */}
      <KpiSplitView
        departmentKey={departmentKey}
        year={selectedYear}
        canEdit={canEdit}
        onStatsChange={setStats}
      />
    </div>
  );
}
