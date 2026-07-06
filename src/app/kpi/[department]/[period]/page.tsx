"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Plus, Calendar, Activity, BarChart2, Target,
  CheckCircle2, AlertTriangle, TrendingDown, Clock, Lock,
  ListTodo, ChevronDown, Pencil, Trash2, Check, X, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiActionItemList } from "@/components/kpi/kpi-action-item-list";
import type { GoalNodeData } from "@/components/kpi/kpi-yearly-card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodType = "weekly" | "monthly" | "quarterly" | "yearly";

// ─── Constants ───────────────────────────────────────────────────────────────

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

const STATUS_META: Record<string, {
  dot: string; label: string; bar: string; icon: React.ReactNode;
  border: string; text: string; lightBg: string;
}> = {
  green:  { dot: "bg-emerald-500", label: "On Track",  bar: "bg-emerald-500", icon: <CheckCircle2 className="h-3.5 w-3.5" />, border: "border-emerald-200", text: "text-emerald-600", lightBg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-400",   label: "At Risk",   bar: "bg-amber-400",   icon: <AlertTriangle className="h-3.5 w-3.5" />, border: "border-amber-200",  text: "text-amber-600",  lightBg: "bg-amber-50"   },
  red:    { dot: "bg-red-500",     label: "Off Track", bar: "bg-red-500",     icon: <TrendingDown className="h-3.5 w-3.5" />,  border: "border-red-200",    text: "text-red-600",    lightBg: "bg-red-50"     },
  none:   { dot: "bg-gray-300",    label: "Pending",   bar: "bg-gray-200",    icon: <Clock className="h-3.5 w-3.5" />,         border: "border-gray-200",   text: "text-gray-500",   lightBg: "bg-gray-50"    },
};

const STATUS_BORDER_L: Record<string, string> = {
  green: "border-l-emerald-500", yellow: "border-l-amber-400",
  red: "border-l-red-500",       none: "border-l-border",
};

const PERIOD_META: Record<PeriodType, {
  label: string;
  Icon: React.FC<{ className?: string }>;
  accent: string;
  iconBg: string;
  badge: string;
}> = {
  weekly:    { label: "Weekly KPI",    Icon: Activity, accent: "text-orange-500", iconBg: "bg-orange-50",  badge: "bg-orange-50 text-orange-700 border-orange-200"  },
  monthly:   { label: "Monthly KPI",   Icon: Calendar, accent: "text-cyan-600",   iconBg: "bg-cyan-50",    badge: "bg-cyan-50 text-cyan-700 border-cyan-200"         },
  quarterly: { label: "Quarterly KPI", Icon: BarChart2, accent: "text-blue-600",  iconBg: "bg-blue-50",    badge: "bg-blue-50 text-blue-700 border-blue-200"         },
  yearly:    { label: "Yearly KPI",    Icon: Target,   accent: "text-violet-600", iconBg: "bg-violet-50",  badge: "bg-violet-50 text-violet-700 border-violet-200"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(v: string) {
  const m = v.match(/(\d{4})-(\d{2})/);
  if (!m) return v;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[2]) - 1]} ${m[1]}`;
}

function weekLabel(v: string) {
  const m = v.match(/W(\d)-(\d{4})-(\d{2})/);
  if (!m) return v;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[3]) - 1]} · Week ${m[1]}`;
}

function periodSortKey(v: string): string {
  const week = v.match(/^W(\d)-(\d{4})-(\d{2})$/);
  if (week) return `${week[2]}-${week[3]}-W${week[1]}`;
  const quarter = v.match(/^Q(\d)-(\d{4})$/);
  if (quarter) return `${quarter[2]}-Q${quarter[1]}`;
  return v;
}

function humanLabel(period: PeriodType, periodLabel: string): string {
  if (period === "monthly")   return monthLabel(periodLabel);
  if (period === "weekly")    return weekLabel(periodLabel);
  if (period === "quarterly") return periodLabel.replace("-", " ");
  return periodLabel;
}

function parseNum(v?: string | null) {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function computeStats(goal: GoalNodeData): { pct: number | null; status: string } {
  const a = parseNum(goal.actual), t = parseNum(goal.target);
  if (a === null || t === null || t === 0) return { pct: null, status: "none" };
  const raw = goal.higherIsBetter ? (a / t) * 100 : (t / a) * 100;
  const pct = Math.max(0, Math.min(raw, 150));
  const ratio = a / t;
  const status = goal.higherIsBetter
    ? (ratio >= 1.0 ? "green" : ratio >= 0.8 ? "yellow" : "red")
    : (ratio <= 1.0 ? "green" : ratio <= 1.2 ? "yellow" : "red");
  return { pct, status };
}

// ─── EditValues & EditForm ────────────────────────────────────────────────────

interface EditValues {
  name: string; periodLabel: string; unit: string;
  target: string; actual: string; higherIsBetter: boolean; notes: string;
}

interface ParentGoalOption { id: number; name: string; periodLabel: string; }

function blankEdit(g?: GoalNodeData): EditValues {
  return {
    name: g?.name ?? "", periodLabel: g?.periodLabel ?? "",
    unit: g?.unit ?? "", target: g?.target ?? "",
    actual: g?.actual ?? "", higherIsBetter: g?.higherIsBetter ?? true, notes: g?.notes ?? "",
  };
}

function EditForm({
  v, set, onSave, onCancel, saving, isNew = false, level,
  parentGoals, selectedParentId, onParentChange,
}: {
  v: EditValues; set: (v: EditValues) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; isNew?: boolean; level?: string;
  parentGoals?: ParentGoalOption[];
  selectedParentId?: number | null;
  onParentChange?: (id: number | null) => void;
}) {
  const f = (k: keyof EditValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set({ ...v, [k]: e.target.value });

  const periodPlaceholder: Record<string, string> = {
    yearly: "e.g. 2026", quarterly: "e.g. Q1-2026",
    monthly: "e.g. 2026-07", weekly: "e.g. W2-2026-07", daily: "e.g. 2026-07-15",
  };

  const parentLevelLabel: Record<string, string> = {
    quarterly: "Yearly", monthly: "Quarterly", weekly: "Monthly",
  };
  const parentLabel = level ? parentLevelLabel[level] : null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
        {isNew ? `+ New ${level ?? ""} KPI Goal` : "✎ Edit KPI Goal"}
      </p>

      {/* Parent goal selector */}
      {parentGoals && parentGoals.length > 0 && parentLabel && onParentChange && (
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Link to {parentLabel} Goal <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
          </label>
          <select
            value={selectedParentId ?? ""}
            onChange={e => onParentChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">— No parent goal —</option>
            {parentGoals.map(g => (
              <option key={g.id} value={g.id}>{g.periodLabel} · {g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
          Name <span className="text-destructive">*</span>
        </label>
        <Input value={v.name} onChange={f("name")} placeholder="e.g. Revenue Growth" className="h-8 text-sm" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Period</label>
          <Input value={v.periodLabel} onChange={f("periodLabel")}
            placeholder={level ? (periodPlaceholder[level] ?? "e.g. Q1-2026") : "e.g. Q1-2026"}
            className="h-8 text-sm font-mono" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Unit</label>
          <Input value={v.unit} onChange={f("unit")} placeholder="%, Cr, Units…" className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Target</label>
          <Input value={v.target} onChange={f("target")} placeholder="e.g. 100" inputMode="decimal" className="h-8 text-sm tabular-nums" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Actual</label>
          <Input value={v.actual} onChange={f("actual")} placeholder="e.g. 85" inputMode="decimal" className="h-8 text-sm tabular-nums" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Direction</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => set({ ...v, higherIsBetter: true })}
            className={cn("flex-1 h-8 text-xs rounded-md border font-medium transition-colors",
              v.higherIsBetter ? "bg-emerald-600 text-white border-emerald-600" : "bg-background text-muted-foreground border-input hover:bg-muted")}>
            ↑ Higher is better
          </button>
          <button type="button" onClick={() => set({ ...v, higherIsBetter: false })}
            className={cn("flex-1 h-8 text-xs rounded-md border font-medium transition-colors",
              !v.higherIsBetter ? "bg-blue-600 text-white border-blue-600" : "bg-background text-muted-foreground border-input hover:bg-muted")}>
            ↓ Lower is better
          </button>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
          Notes <span className="normal-case font-normal">(optional)</span>
        </label>
        <Textarea value={v.notes} onChange={e => set({ ...v, notes: e.target.value })}
          placeholder="Context, methodology, or source of data…" rows={2} className="text-sm resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-8 gap-1.5">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="h-8 gap-1.5">
          <Check className="h-3.5 w-3.5" />
          {saving ? (isNew ? "Creating…" : "Saving…") : (isNew ? "Create" : "Save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal: initialGoal, level, canEdit, onUpdated, onDeleted, parentGoals }: {
  goal: GoalNodeData;
  level: PeriodType;
  canEdit: boolean;
  onUpdated: (g: GoalNodeData) => void;
  onDeleted: (id: number) => void;
  parentGoals?: ParentGoalOption[];
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(initialGoal));
  const [selectedParentId, setSelectedParentId] = useState<number | null>(initialGoal.parentId ?? null);
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [nameExpanded, setNameExpanded] = useState(false);

  const { pct, status: sk } = computeStats(goal);
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const hasData = goal.actual !== null && goal.actual !== "" && goal.actual !== undefined;
  const progressPct = Math.min(pct ?? 0, 100);
  const actionCount = goal._count?.actionItems ?? 0;

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ev.name.trim(), periodLabel: ev.periodLabel.trim(),
          unit: ev.unit || null, target: ev.target || null,
          actual: ev.actual || null, higherIsBetter: ev.higherIsBetter,
          notes: ev.notes || null, parentId: selectedParentId,
        }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      const u = { ...goal, ...j.data } as GoalNodeData;
      setGoal(u); onUpdated(u); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  return (
    <>
      <div className={cn(
        "group relative bg-card border border-l-4 rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-md",
        STATUS_BORDER_L[sk] ?? STATUS_BORDER_L.none,
      )}>
        {/* ── Name + controls ───────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <span className={cn("mt-[5px] h-2 w-2 rounded-full shrink-0", meta.dot)} />
              <button type="button" onClick={() => setNameExpanded(e => !e)} className="text-left min-w-0">
                <h3 className={cn("text-sm font-semibold text-foreground leading-snug", !nameExpanded && "line-clamp-2")}>
                  {goal.name}
                </h3>
              </button>
            </div>
            {canEdit && (
              <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                <Button size="icon" variant="ghost" className="h-6 w-6"
                  onClick={() => { setEv(blankEdit(goal)); setSelectedParentId(goal.parentId ?? null); setEditing(e => !e); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost"
                  className="h-6 w-6 text-destructive/40 hover:text-destructive"
                  onClick={() => setDelOpen(true)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 pl-4">
            {goal.periodLabel}{goal.unit ? <> · <span className="font-medium">{goal.unit}</span></> : null}
          </p>
          {goal.notes && (
            <p className="text-[11px] text-muted-foreground mt-1.5 pl-4 line-clamp-2 italic">{goal.notes}</p>
          )}
        </div>

        {/* ── Actual vs Target ──────────────────────────────────── */}
        <div className="mx-4 mb-3 grid grid-cols-2 divide-x divide-border/40 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Actual</p>
            {hasData ? (
              <p className={cn("text-xl font-bold tabular-nums leading-none", sk !== "none" ? meta.text : "text-foreground")}>
                {goal.actual!}
                {goal.unit && <span className="text-[11px] font-normal text-muted-foreground ml-0.5">{goal.unit}</span>}
              </p>
            ) : (
              <p className="text-xl font-bold leading-none text-muted-foreground/30">—</p>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Target</p>
            {goal.target ? (
              <p className="text-xl font-bold tabular-nums leading-none text-foreground">
                {goal.target}
                {goal.unit && <span className="text-[11px] font-normal text-muted-foreground ml-0.5">{goal.unit}</span>}
              </p>
            ) : (
              <p className="text-xl font-bold leading-none text-muted-foreground/30">—</p>
            )}
          </div>
        </div>

        {/* ── Progress bar ──────────────────────────────────────── */}
        <div className="px-4 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Progress</span>
            <span className={cn("text-xs font-bold tabular-nums", sk !== "none" ? meta.text : "text-muted-foreground")}>
              {pct !== null ? `${Math.round(pct)}%` : "—"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-300", meta.bar)} style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* ── Status + direction ────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", meta.lightBg, meta.border, meta.text)}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {goal.higherIsBetter ? "↑ Higher" : "↓ Lower"} is better
          </span>
        </div>

        {/* ── Action items toggle ───────────────────────────────── */}
        <div className="border-t border-border/30">
          <button type="button" onClick={() => setShowActions(v => !v)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-expanded={showActions}>
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Action Items</span>
            {actionCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold text-foreground">
                {actionCount}
              </span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform duration-200", showActions && "rotate-180")} />
          </button>
          {showActions && (
            <div className="px-4 pb-3 pt-1">
              <KpiActionItemList
                goalId={goal.id}
                initialItems={goal.actionItems ?? []}
                canEdit={canEdit}
                autoLoad={goal.actionItems === undefined}
                defaultCollapsed={false}
                hideHeader
              />
            </div>
          )}
        </div>

        {/* ── Inline edit form ──────────────────────────────────── */}
        {editing && (
          <div className="px-4 pb-4 pt-1">
            <EditForm
              v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} level={level}
              parentGoals={parentGoals} selectedParentId={selectedParentId} onParentChange={setSelectedParentId}
            />
          </div>
        )}
      </div>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{goal.name}&quot; and all its action items? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Add Goal Inline ──────────────────────────────────────────────────────────

function AddGoalInline({ level, periodLabel, departmentKey, parentGoals, onAdded, onCancel }: {
  level: PeriodType; periodLabel: string; departmentKey: string;
  parentGoals?: ParentGoalOption[];
  onAdded: (g: GoalNodeData) => void; onCancel: () => void;
}) {
  const [ev, setEv] = useState<EditValues>({
    name: "", periodLabel, unit: "", target: "", actual: "", higherIsBetter: true, notes: "",
  });
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!ev.name.trim() || !ev.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey, level, parentId: selectedParentId,
          name: ev.name.trim(), periodLabel: ev.periodLabel.trim(),
          target: ev.target || null, actual: ev.actual || null,
          unit: ev.unit || null, higherIsBetter: ev.higherIsBetter, notes: ev.notes || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      onAdded(j.data as GoalNodeData); toast.success("Created");
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  return (
    <EditForm
      v={ev} set={setEv} onSave={handleSave} onCancel={onCancel} saving={saving} isNew level={level}
      parentGoals={parentGoals} selectedParentId={selectedParentId} onParentChange={setSelectedParentId}
    />
  );
}

// ─── Period Group ─────────────────────────────────────────────────────────────

function PeriodGroup({ period, goals, periodType, canEdit, departmentKey, onGoalsChange, parentGoals }: {
  period: string;
  goals: GoalNodeData[];
  periodType: PeriodType;
  canEdit: boolean;
  departmentKey: string;
  onGoalsChange: (period: string, goals: GoalNodeData[]) => void;
  parentGoals?: ParentGoalOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const label = humanLabel(periodType, period);

  const statusCounts = goals.reduce((acc, g) => {
    const sk = computeStats(g).status;
    acc[sk] = (acc[sk] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* ── Period header row ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 min-w-0"
        >
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", collapsed && "-rotate-90")} />
          <span className="text-sm font-bold text-foreground truncate">{label}</span>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
          {goals.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">No goals</span>
          ) : (
            Object.entries(statusCounts).map(([sk, cnt]) => {
              const m = STATUS_META[sk] ?? STATUS_META.none;
              return (
                <span key={sk} className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                  m.lightBg, m.border, m.text,
                )}>
                  {cnt} {m.label}
                </span>
              );
            })
          )}
        </div>

        <div className="flex-1 h-px bg-border/40 min-w-[20px]" />

        {canEdit && !adding && !collapsed && (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs shrink-0"
            onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Add Goal
          </Button>
        )}
      </div>

      {/* ── Goals grid ─────────────────────────────────────────── */}
      {!collapsed && (
        <div className="space-y-4">
          {goals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {goals.map(g => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  level={periodType}
                  canEdit={canEdit}
                  parentGoals={parentGoals}
                  onUpdated={u => onGoalsChange(period, goals.map(x => x.id === u.id ? { ...x, ...u } : x))}
                  onDeleted={id => onGoalsChange(period, goals.filter(x => x.id !== id))}
                />
              ))}
            </div>
          )}
          {adding && (
            <AddGoalInline
              level={periodType}
              periodLabel={period}
              departmentKey={departmentKey}
              parentGoals={parentGoals}
              onAdded={g => { onGoalsChange(period, [...goals, g]); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, pct, valueCls, borderCls, iconBg }: {
  icon: React.ReactNode; value: number; label: string; pct: number;
  valueCls: string; borderCls: string; iconBg: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-5 py-4 bg-card", borderCls)}>
      <div className={cn("p-2 rounded-full shrink-0", iconBg)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-2xl font-bold leading-none", valueCls)}>{value}</div>
        <div className="text-[11px] font-semibold mt-1 uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-muted-foreground">{pct}%</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KpiPeriodViewAllPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const departmentKey = params.department as string;
  const periodParam = params.period as string;

  const validPeriods: PeriodType[] = ["weekly", "monthly", "quarterly", "yearly"];
  const period = validPeriods.includes(periodParam as PeriodType) ? (periodParam as PeriodType) : null;

  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [goals, setGoals] = useState<GoalNodeData[]>([]);
  const [parentGoals, setParentGoals] = useState<ParentGoalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptName, setDeptName] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const userRole = (session?.user as { role?: string })?.role ?? "";
  const isElevated = ELEVATED_ROLES.includes(userRole);
  const isOwnDept = userDepartment === departmentKey;
  const canEdit = isElevated || isOwnDept;

  // Map each period type to the level it should link to as a parent
  const parentLevelMap: Partial<Record<PeriodType, string>> = {
    quarterly: "yearly",
    monthly: "quarterly",
    weekly: "monthly",
  };

  const fetchAll = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    try {
      const parentLevel = parentLevelMap[period];
      const fetches: Promise<Response>[] = [
        fetch(`/api/kpi/goals?department=${departmentKey}&level=${period}`),
        fetch("/api/kpi/departments"),
        fetch("/api/profile"),
      ];
      if (parentLevel) {
        fetches.push(fetch(`/api/kpi/goals?department=${departmentKey}&level=${parentLevel}`));
      }
      const [goalsRes, deptRes, profileRes, parentRes] = await Promise.all(fetches);
      if (goalsRes.ok) {
        const j = await goalsRes.json();
        const all: GoalNodeData[] = j.data ?? [];
        setGoals(all.filter(g => g.periodLabel.includes(selectedYear)));
      }
      if (deptRes.ok) {
        const j = await deptRes.json();
        const dept = (j.data ?? []).find((d: { key: string; name: string }) => d.key === departmentKey);
        if (dept) setDeptName(dept.name);
      }
      if (profileRes.ok) {
        const j = await profileRes.json();
        setUserDepartment(j.data?.department ?? null);
      }
      if (parentRes?.ok) {
        const j = await parentRes.json();
        const all: GoalNodeData[] = j.data ?? [];
        setParentGoals(
          all
            .filter(g => g.periodLabel.includes(selectedYear))
            .map(g => ({ id: g.id, name: g.name, periodLabel: g.periodLabel }))
        );
      }
    } finally { setLoading(false); }
  }, [departmentKey, period, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") { fetchAll(); }
  }, [authStatus, router, fetchAll]);

  if (!period) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <p className="text-base font-medium text-foreground">Invalid period type.</p>
        <Button variant="outline" onClick={() => router.push(`/kpi/${departmentKey}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Department
        </Button>
      </div>
    );
  }

  const meta = PERIOD_META[period];
  const Icon = meta.Icon;
  const yearOptions = [String(Number(currentYear) - 1), currentYear, String(Number(currentYear) + 1)];

  // Group by periodLabel, sorted chronologically
  const grouped = goals.reduce((acc, g) => {
    if (!acc[g.periodLabel]) acc[g.periodLabel] = [];
    acc[g.periodLabel].push(g);
    return acc;
  }, {} as Record<string, GoalNodeData[]>);

  const sortedPeriods = Object.keys(grouped).sort((a, b) =>
    periodSortKey(a).localeCompare(periodSortKey(b))
  );

  // Aggregate stats
  const total = goals.length;
  const safeTotal = total || 1;
  const greenCount  = goals.filter(g => computeStats(g).status === "green").length;
  const yellowCount = goals.filter(g => computeStats(g).status === "yellow").length;
  const redCount    = goals.filter(g => computeStats(g).status === "red").length;
  const pendingCount = Math.max(0, total - greenCount - yellowCount - redCount);

  const handleGoalsChange = (periodLabel: string, updated: GoalNodeData[]) => {
    setGoals(prev => [...prev.filter(g => g.periodLabel !== periodLabel), ...updated]);
  };

  const handleAddGoalGlobal = (g: GoalNodeData) => {
    setGoals(prev => [...prev, g]);
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/kpi/${departmentKey}`)} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={cn("p-2 rounded-lg shrink-0", meta.iconBg)}>
            <Icon className={cn("h-5 w-5", meta.accent)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{deptName || departmentKey}</h1>
              <Badge variant="outline" className={cn("text-xs shrink-0 font-medium border", meta.badge)}>
                {meta.label}
              </Badge>
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
            <p className="text-sm text-muted-foreground mt-0.5">
              All {meta.label} goals · {selectedYear}
            </p>
          </div>
        </div>

        {/* Right: year selector + refresh + add */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && !loading && (
            <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={() => setAdding(a => !a)}>
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          )}
          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
            {yearOptions.map(y => (
              <button key={y} type="button" onClick={() => setSelectedYear(y)}
                className={cn("h-8 px-3 text-sm rounded-md font-semibold transition-colors",
                  selectedYear === y ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {y}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Global add form ─────────────────────────────────────────────── */}
      {adding && (
        <AddGoalInline
          level={period}
          periodLabel={period === "quarterly" ? `Q1-${selectedYear}` : period === "monthly" ? `${selectedYear}-01` : period === "weekly" ? `W1-${selectedYear}-01` : selectedYear}
          departmentKey={departmentKey}
          parentGoals={parentGoals}
          onAdded={handleAddGoalGlobal}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            value={total} label="Total Goals"
            pct={100}
            valueCls="text-foreground"
            borderCls="border-border"
            iconBg="bg-muted/50"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            value={greenCount} label="On Track"
            pct={total === 0 ? 0 : Math.round((greenCount / safeTotal) * 100)}
            valueCls="text-emerald-600"
            borderCls="border-emerald-100"
            iconBg="bg-emerald-50"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            value={yellowCount} label="At Risk"
            pct={total === 0 ? 0 : Math.round((yellowCount / safeTotal) * 100)}
            valueCls="text-amber-600"
            borderCls="border-amber-100"
            iconBg="bg-amber-50"
          />
          <StatCard
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            value={redCount} label="Off Track"
            pct={total === 0 ? 0 : Math.round((redCount / safeTotal) * 100)}
            valueCls="text-red-600"
            borderCls="border-red-100"
            iconBg="bg-red-50"
          />
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading {meta.label} goals…</span>
        </div>
      ) : sortedPeriods.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-muted-foreground rounded-xl border border-dashed border-border bg-card">
          <Icon className={cn("h-12 w-12 mb-3 opacity-20", meta.accent)} />
          <p className="text-base font-semibold text-foreground">No {meta.label} goals for {selectedYear}</p>
          <p className="text-sm mt-1 max-w-sm">
            Use the Add Goal button above, or go back to the department page to add goals to specific periods.
          </p>
          <div className="flex items-center gap-2 mt-5">
            <Button variant="outline" onClick={() => router.push(`/kpi/${departmentKey}`)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Department
            </Button>
            {canEdit && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Add First Goal
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedPeriods.map(p => (
            <PeriodGroup
              key={p}
              period={p}
              goals={grouped[p]}
              periodType={period}
              canEdit={canEdit}
              departmentKey={departmentKey}
              onGoalsChange={handleGoalsChange}
              parentGoals={parentGoals}
            />
          ))}

          {/* Pending / empty periods note */}
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {pendingCount} goal{pendingCount !== 1 ? "s" : ""} with no data yet (shown as &quot;Pending&quot;)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
