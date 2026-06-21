"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiYearlyCard, type GoalNodeData } from "./kpi-yearly-card";

interface KpiGoalTreeProps {
  departmentKey: string;
  year: string;
  canEdit: boolean;
  onStatsChange?: (stats: { total: number; green: number; yellow: number; red: number }) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}

export function KpiGoalTree({ departmentKey, year, canEdit, onStatsChange }: KpiGoalTreeProps) {
  const [goals, setGoals] = useState<GoalNodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingYearly, setIsAddingYearly] = useState(false);
  const [addName, setAddName] = useState("");
  const [addTarget, setAddTarget] = useState("");
  const [addUnit, setAddUnit] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/kpi/goals?department=${departmentKey}&year=${year}`);
      const json = await res.json();
      if (res.ok) {
        const data: GoalNodeData[] = json.data ?? [];
        setGoals(data);
        onStatsChange?.({
          total: data.length,
          green: data.filter((g) => g.status === "green").length,
          yellow: data.filter((g) => g.status === "yellow").length,
          red: data.filter((g) => g.status === "red").length,
        });
      } else {
        toast.error(json.error || "Failed to load KPI goals");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [departmentKey, year, onStatsChange]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleAddYearly = async () => {
    if (!addName.trim()) { toast.error("Goal name is required"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey,
          level: "yearly",
          parentId: null,
          name: addName.trim(),
          periodLabel: year,
          target: addTarget || null,
          unit: addUnit || null,
          higherIsBetter: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      setGoals((prev) => [...prev, json.data as GoalNodeData]);
      toast.success("Yearly KPI created");
      setAddName(""); setAddTarget(""); setAddUnit("");
      setIsAddingYearly(false);
    } catch { toast.error("Unexpected error"); }
    finally { setIsSaving(false); }
  };

  const handleGoalUpdated = useCallback((updated: GoalNodeData) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
  }, []);

  const handleGoalDeleted = useCallback((id: number) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading goals…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {canEdit && !isAddingYearly && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setIsAddingYearly(true)} className="gap-1.5 h-8">
            <Plus className="h-4 w-4" /> Add Yearly KPI
          </Button>
        </div>
      )}

      {/* Inline add yearly form */}
      {isAddingYearly && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            + New Yearly KPI for {year}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Goal Name *">
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Revenue Achievement" className="h-8 text-sm" autoFocus />
            </Field>
            <Field label="Target">
              <Input value={addTarget} onChange={(e) => setAddTarget(e.target.value)} placeholder="e.g. 10 Cr" className="h-8 text-sm" />
            </Field>
            <Field label="Unit">
              <Input value={addUnit} onChange={(e) => setAddUnit(e.target.value)} placeholder="%, Cr, units…" className="h-8 text-sm" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsAddingYearly(false)} disabled={isSaving} className="h-8 gap-1">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleAddYearly} disabled={isSaving} className="h-8 gap-1">
              <Check className="h-3.5 w-3.5" /> {isSaving ? "Creating…" : "Create Goal"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !isAddingYearly && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-semibold text-foreground text-lg">No KPI goals for {year}</p>
          <p className="text-sm mt-1.5">
            {canEdit ? (
              <>Click <strong>Add Yearly KPI</strong> to set up your first goal for this department.</>
            ) : (
              "No goals have been created for this year yet."
            )}
          </p>
        </div>
      )}

      {/* Yearly goal cards */}
      {goals.map((goal) => (
        <KpiYearlyCard
          key={goal.id}
          goal={goal}
          departmentKey={departmentKey}
          canEdit={canEdit}
          onUpdated={handleGoalUpdated}
          onDeleted={handleGoalDeleted}
        />
      ))}
    </div>
  );
}
