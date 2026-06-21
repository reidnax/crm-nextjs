"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, Check, X, Pencil, Trash2,
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
  TrendingDown, Clock, ListTodo, Target,
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
import { KpiActionItemList } from "./kpi-action-item-list";
import type { GoalNodeData } from "./kpi-yearly-card";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

export interface KpiSplitViewProps {
  departmentKey: string;
  year: string;
  canEdit: boolean;
  onStatsChange?: (s: { total: number; green: number; yellow: number; red: number }) => void;
}

interface EditValues {
  name: string; periodLabel: string; unit: string;
  target: string; actual: string;
  higherIsBetter: boolean; notes: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { dot: string; label: string; bar: string; icon: React.ReactNode }> = {
  green:  { dot: "bg-emerald-500", label: "On Track",  bar: "bg-emerald-500", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
  yellow: { dot: "bg-amber-400",   label: "At Risk",   bar: "bg-amber-400",   icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
  red:    { dot: "bg-red-500",     label: "Off Track", bar: "bg-red-500",     icon: <TrendingDown   className="h-3.5 w-3.5 text-red-500"   /> },
  none:   { dot: "bg-border",      label: "No Data",   bar: "bg-muted-foreground/20", icon: <Clock className="h-3.5 w-3.5 text-muted-foreground/50" /> },
};

// Status color text helper
function statusColor(sk: string) {
  return sk === "green" ? "text-emerald-600" : sk === "yellow" ? "text-amber-600" : sk === "red" ? "text-red-600" : "text-muted-foreground";
}

const LEVEL_BADGE: Record<string, string> = {
  yearly:    "bg-violet-100 text-violet-700 border-violet-200",
  quarterly: "bg-blue-100 text-blue-700 border-blue-200",
  monthly:   "bg-cyan-100 text-cyan-700 border-cyan-200",
  weekly:    "bg-orange-100 text-orange-700 border-orange-200",
  daily:     "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function blankEdit(g?: GoalNodeData): EditValues {
  return {
    name: g?.name ?? "", periodLabel: g?.periodLabel ?? "",
    unit: g?.unit ?? "", target: g?.target ?? "",
    actual: g?.actual ?? "",
    higherIsBetter: g?.higherIsBetter ?? true, notes: g?.notes ?? "",
  };
}

/** Auto-suggest a period label for a new child goal based on parent period + sibling count. */
function suggestPeriod(parentPeriod: string, childLevel: string, siblingCount: number): string {
  const n = siblingCount + 1;
  if (childLevel === "quarterly") {
    return `Q${n}-${parentPeriod}`;
  }
  if (childLevel === "monthly") {
    const m = parentPeriod.match(/Q(\d)-(\d{4})/);
    if (m) {
      const month = (parseInt(m[1]) - 1) * 3 + n;
      return `${m[2]}-${String(month).padStart(2, "0")}`;
    }
    return "";
  }
  if (childLevel === "weekly") {
    return `W${n}-${parentPeriod}`;
  }
  if (childLevel === "daily") {
    return new Date().toISOString().split("T")[0]; // today
  }
  return "";
}

/** Create a pre-filled EditValues for a new child goal given parent context. */
function blankChild(parentPeriod: string, childLevel: string, siblingCount: number): EditValues {
  const period = suggestPeriod(parentPeriod, childLevel, siblingCount);
  const name = suggestName(childLevel, period);
  return { ...blankEdit(), periodLabel: period, name };
}

/** Auto-suggest a display name for a new child goal based on its period label. */
function suggestName(childLevel: string, periodLabel: string): string {
  if (childLevel === "quarterly") {
    return periodLabel; // e.g. "Q1-2026"
  }
  if (childLevel === "monthly") {
    const m = periodLabel.match(/(\d{4})-(\d{2})/);
    if (m) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(m[2]) - 1]} ${m[1]}`;
    }
    return periodLabel;
  }
  if (childLevel === "weekly") {
    const m = periodLabel.match(/W(\d+)/);
    return m ? `Week ${m[1]}` : periodLabel;
  }
  if (childLevel === "daily") {
    return periodLabel; // e.g. "2026-06-22"
  }
  return "";
}

function parseNum(v?: string | null) {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

/**
 * Normalise a single goal's achievement to a 0-150 scale where 100 = on target.
 * Works for both "higher is better" and "lower is better" goals.
 */
function ownPct(goal: GoalNodeData): number | null {
  const a = parseNum(goal.actual), t = parseNum(goal.target);
  if (a === null || t === null || t === 0) return null;
  const pct = goal.higherIsBetter ? (a / t) * 100 : (t / a) * 100;
  return Math.max(0, Math.min(pct, 150));
}

/**
 * Compute the average normalised % from a list of children.
 * Children without actual/target are excluded from the average.
 */
function rollupStats(children: GoalNodeData[]): { pct: number | null; count: number } {
  const vals = children.map(ownPct).filter((p): p is number => p !== null);
  if (vals.length === 0) return { pct: null, count: 0 };
  return { pct: vals.reduce((s, v) => s + v, 0) / vals.length, count: vals.length };
}

/**
 * Resolve display stats for a goal level.
 * Priority: own actual/target → children rollup → no data.
 */
function displayStats(goal: GoalNodeData, children?: GoalNodeData[]): {
  pct: number | null; status: string; isRollup: boolean; rollupCount: number;
} {
  const p = ownPct(goal);
  if (p !== null) {
    const ratio = (parseNum(goal.actual) ?? 0) / (parseNum(goal.target) ?? 1);
    const status = goal.higherIsBetter
      ? (ratio >= 1.0 ? "green" : ratio >= 0.8 ? "yellow" : "red")
      : (ratio <= 1.0 ? "green" : ratio <= 1.2 ? "yellow" : "red");
    return { pct: p, status, isRollup: false, rollupCount: 0 };
  }
  if (children && children.length > 0) {
    const { pct, count } = rollupStats(children);
    if (pct !== null) {
      const status = pct >= 100 ? "green" : pct >= 80 ? "yellow" : "red";
      return { pct, status, isRollup: true, rollupCount: count };
    }
  }
  return { pct: null, status: "none", isRollup: false, rollupCount: 0 };
}

/** Kept for leaf-level use (DayRow) where no children exist. */
function effectiveStatus(goal: GoalNodeData): string {
  return displayStats(goal).status;
}

async function patchGoal(id: number, ev: EditValues) {
  return fetch(`/api/kpi/goals/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: ev.name.trim(), periodLabel: ev.periodLabel.trim(),
      unit: ev.unit || null, target: ev.target || null, actual: ev.actual || null,
      higherIsBetter: ev.higherIsBetter, notes: ev.notes || null,
    }),
  });
}

async function deleteGoal(id: number) {
  return fetch(`/api/kpi/goals/${id}`, { method: "DELETE" });
}

async function createGoal(departmentKey: string, level: string, parentId: number | null, ev: EditValues) {
  return fetch("/api/kpi/goals", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      departmentKey, level, parentId,
      name: ev.name.trim(), periodLabel: ev.periodLabel.trim(),
      target: ev.target || null,
      actual: ev.actual || null,
      unit: ev.unit || null,
      higherIsBetter: ev.higherIsBetter,
      notes: ev.notes || null,
    }),
  });
}

async function loadChildren(goalId: number): Promise<GoalNodeData[]> {
  const res = await fetch(`/api/kpi/goals/${goalId}`);
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed");
  return (j.data?.children as GoalNodeData[]) ?? [];
}

// ─── shared inline edit form ──────────────────────────────────────────────────

function EditForm({
  v, set, onSave, onCancel, saving, compact = false, isNew = false,
}: {
  v: EditValues; set: (v: EditValues) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; compact?: boolean; isNew?: boolean;
}) {
  const f = (k: keyof EditValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set({ ...v, [k]: e.target.value });

  return (
    <div className="space-y-2 pt-2 border-t border-dashed border-border/50">
      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        <div className={compact ? "col-span-2" : "sm:col-span-2"}>
          <label className="field-label">Name</label>
          <Input value={v.name} onChange={f("name")} className="h-8 text-sm" autoFocus />
        </div>
        <div>
          <label className="field-label">Period</label>
          <Input value={v.periodLabel} onChange={f("periodLabel")} className="h-8 text-sm" />
        </div>
        <div>
          <label className="field-label">Unit</label>
          <Input value={v.unit} onChange={f("unit")} placeholder="%, Cr…" className="h-8 text-sm" />
        </div>
        <div>
          <label className="field-label">Target</label>
          <Input value={v.target} onChange={f("target")} type="number" step="any" className="h-8 text-sm" />
        </div>
        <div>
          <label className="field-label">Actual</label>
          <Input value={v.actual} onChange={f("actual")} type="number" step="any" className="h-8 text-sm" />
        </div>
        <div className={compact ? "col-span-2" : "sm:col-span-2"}>
          <label className="field-label">Direction</label>
          <div className="flex gap-1 mt-0.5">
            <button
              type="button"
              onClick={() => set({ ...v, higherIsBetter: true })}
              className={cn(
                "flex-1 h-8 text-xs rounded border font-medium transition-colors",
                v.higherIsBetter
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-background text-muted-foreground border-input hover:bg-muted"
              )}
            >
              ↑ Higher is better
            </button>
            <button
              type="button"
              onClick={() => set({ ...v, higherIsBetter: false })}
              className={cn(
                "flex-1 h-8 text-xs rounded border font-medium transition-colors",
                !v.higherIsBetter
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-background text-muted-foreground border-input hover:bg-muted"
              )}
            >
              ↓ Lower is better
            </button>
          </div>
        </div>
      </div>
      {!compact && (
        <div>
          <label className="field-label">Notes</label>
          <Textarea value={v.notes} onChange={e => set({ ...v, notes: e.target.value })} rows={2} className="text-sm resize-none" />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-8 gap-1">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="h-8 gap-1">
          <Check className="h-3.5 w-3.5" /> {saving ? (isNew ? "Creating…" : "Saving…") : (isNew ? "Create" : "Save")}
        </Button>
      </div>
    </div>
  );
}


// ─── delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  open, onOpenChange, title, description, onConfirm, deleting,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description: string;
  onConfirm: () => void; deleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── DAY ROW ─────────────────────────────────────────────────────────────────

function DayRow({
  day, canEdit, onUpdated, onDeleted,
}: {
  day: GoalNodeData; canEdit: boolean;
  onUpdated: (g: GoalNodeData) => void; onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(day));
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sk = effectiveStatus(day);
  const meta = STATUS_META[sk] ?? STATUS_META.none;

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(day.id, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      onUpdated({ ...day, ...j.data }); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(day.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(day.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  return (
    <>
      <div className="group flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded transition-colors">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
        <Badge variant="outline" className={cn("text-[9px] px-1 py-0 font-mono shrink-0", LEVEL_BADGE.daily)}>
          {day.periodLabel}
        </Badge>
        <span className="text-xs font-medium truncate flex-1">{day.name}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {day.target && <span>T:{day.target}</span>}
          {day.actual && <><span className="mx-1">·</span><strong className="text-foreground">A:{day.actual}</strong></>}
        </span>
        <span className={cn("text-[10px] font-medium shrink-0", statusColor(sk))}>{meta.label}</span>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="icon" variant="ghost" className="h-5 w-5"
              onClick={() => { setEv(blankEdit(day)); setEditing(e => !e); }}>
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive/50 hover:text-destructive"
              onClick={() => setDelOpen(true)}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}
      </div>
      {editing && (
        <div className="px-2 pb-1.5">
          <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} compact />
        </div>
      )}
      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Daily Entry"
        description={`Delete "${day.name}"?`} onConfirm={handleDelete} deleting={deleting} />
    </>
  );
}

// ─── WEEK ROW ─────────────────────────────────────────────────────────────────

function WeekRow({
  week, canEdit, departmentKey, onUpdated, onDeleted,
}: {
  week: GoalNodeData; canEdit: boolean; departmentKey: string;
  onUpdated: (g: GoalNodeData) => void; onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(week));
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [days, setDays] = useState<GoalNodeData[]>(week.children ?? []);
  const [loadingDays, setLoadingDays] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [addDayEv, setAddDayEv] = useState<EditValues>(blankEdit());
  const [addDaySaving, setAddDaySaving] = useState(false);
  const { pct: weekPct, status: sk, isRollup: weekIsRollup, rollupCount: weekRollupCount } = displayStats(week, days);
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const dayCount = week._count?.children ?? days.length;

  const toggleExpand = async () => {
    if (!expanded && days.length === 0 && dayCount > 0) {
      setLoadingDays(true);
      try { setDays(await loadChildren(week.id)); }
      catch { toast.error("Failed to load daily entries"); }
      finally { setLoadingDays(false); }
    }
    setExpanded(v => !v);
  };

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(week.id, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      onUpdated({ ...week, ...j.data }); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(week.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(week.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  const startAddDay = () => {
    setAddDayEv(blankChild(week.periodLabel, "daily", days.length));
    setAddingDay(true); setExpanded(true);
  };

  const handleAddDay = async () => {
    if (!addDayEv.name.trim() || !addDayEv.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setAddDaySaving(true);
    try {
      const res = await createGoal(departmentKey, "daily", week.id, addDayEv);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      setDays(d => [...d, j.data as GoalNodeData]);
      setAddingDay(false);
      toast.success("Day added");
    } catch { toast.error("Error"); } finally { setAddDaySaving(false); }
  };

  return (
    <>
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30 rounded-lg transition-colors">
        {/* Expand toggle */}
        <button type="button" onClick={toggleExpand}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {dayCount > 0
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
            : <span className={cn("h-2 w-2 rounded-full block", meta.dot)} />}
        </button>
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-mono shrink-0", LEVEL_BADGE.weekly)}>
          {week.periodLabel}
        </Badge>
        <span className="text-xs font-medium truncate flex-1">{week.name}</span>
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
          {week.target && <span>T:{week.target}{week.unit ? week.unit : ""}</span>}
          {week.actual && <><span className="mx-1">·</span><strong className="text-foreground">A:{week.actual}{week.unit ? week.unit : ""}</strong></>}
          {weekPct !== null && (
            <span className={cn("ml-1 font-medium", weekIsRollup ? "text-muted-foreground" : statusColor(sk))}>
              {weekIsRollup ? `~${Math.round(weekPct)}%` : `${Math.round(weekPct)}%`}
            </span>
          )}
          {weekIsRollup && <span className="ml-0.5 opacity-50 text-[10px]">({weekRollupCount}d avg)</span>}
          {!weekIsRollup && dayCount > 0 && <span className="ml-1 opacity-60">· {dayCount}d</span>}
        </span>
        <span className={cn("text-[10px] font-medium shrink-0 hidden sm:block", statusColor(sk))}>{meta.label}</span>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-0.5 text-muted-foreground"
              onClick={startAddDay}>
              <Plus className="h-2.5 w-2.5" />Day
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => { setEv(blankEdit(week)); setEditing(e => !e); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive"
              onClick={() => setDelOpen(true)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <div className="px-3 pb-2">
          <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} compact />
        </div>
      )}

      {expanded && (
        <div className="pl-6 space-y-0.5 pb-1">
          {loadingDays && (
            <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground px-2">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
            </div>
          )}
          {!loadingDays && days.length === 0 && !addingDay && (
            <p className="text-xs text-muted-foreground px-2 py-1.5 italic">
              No daily entries.{" "}
              {canEdit && (
                <button type="button" className="text-primary hover:underline"
                  onClick={startAddDay}>Add one</button>
              )}
            </p>
          )}
          {days.map(d => (
            <DayRow key={d.id} day={d} canEdit={canEdit}
              onUpdated={upd => setDays(ds => ds.map(x => x.id === upd.id ? upd : x))}
              onDeleted={id => setDays(ds => ds.filter(x => x.id !== id))}
            />
          ))}
          {addingDay && (
            <div className="px-2 pt-1">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-1.5">+ New Daily Entry</p>
              <EditForm v={addDayEv} set={setAddDayEv} onSave={handleAddDay}
                onCancel={() => setAddingDay(false)} saving={addDaySaving} compact isNew />
            </div>
          )}
        </div>
      )}

      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Week"
        description={`Delete "${week.name}" and all its daily entries?`}
        onConfirm={handleDelete} deleting={deleting} />
    </>
  );
}

// ─── MONTH ROW ────────────────────────────────────────────────────────────────

function MonthRow({
  month, canEdit, departmentKey, onUpdated, onDeleted,
}: {
  month: GoalNodeData; canEdit: boolean; departmentKey: string;
  onUpdated: (g: GoalNodeData) => void; onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(month));
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [weeks, setWeeks] = useState<GoalNodeData[]>(month.children ?? []);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [addingWeek, setAddingWeek] = useState(false);
  const [addWeekEv, setAddWeekEv] = useState<EditValues>(blankEdit());
  const [addWeekSaving, setAddWeekSaving] = useState(false);
  const { pct: monthPct, status: sk, isRollup: monthIsRollup, rollupCount: monthRollupCount } = displayStats(month, weeks);
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const childCount = month._count?.children ?? weeks.length;

  const toggleExpand = async () => {
    if (!expanded && weeks.length === 0 && childCount > 0) {
      setLoadingWeeks(true);
      try { setWeeks(await loadChildren(month.id)); }
      catch { toast.error("Failed to load"); }
      finally { setLoadingWeeks(false); }
    }
    setExpanded(v => !v);
  };

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(month.id, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      onUpdated({ ...month, ...j.data }); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(month.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(month.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  const startAddWeek = () => {
    setAddWeekEv(blankChild(month.periodLabel, "weekly", weeks.length));
    setAddingWeek(true); setExpanded(true);
  };

  const handleAddWeek = async () => {
    if (!addWeekEv.name.trim() || !addWeekEv.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setAddWeekSaving(true);
    try {
      const res = await createGoal(departmentKey, "weekly", month.id, addWeekEv);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      setWeeks(w => [...w, j.data as GoalNodeData]);
      setAddingWeek(false);
      toast.success("Week added");
    } catch { toast.error("Error"); } finally { setAddWeekSaving(false); }
  };

  const childLabel = childCount > 0
    ? (weeks[0]?.level === "daily" || weeks.some(w => w.level === "daily") ? `${childCount} day${childCount !== 1 ? "s" : ""}` : `${childCount} week${childCount !== 1 ? "s" : ""}`)
    : "0 weeks";

  return (
    <>
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30 rounded-lg transition-colors">
        <button type="button" onClick={toggleExpand}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {childCount > 0
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
            : <span className={cn("h-2 w-2 rounded-full block", meta.dot)} />}
        </button>
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-mono shrink-0", LEVEL_BADGE.monthly)}>
          {month.periodLabel}
        </Badge>
        <span className="text-sm font-medium truncate flex-1">{month.name}</span>
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
          {month.target && <span>T:{month.target}{month.unit ? month.unit : ""}</span>}
          {month.actual && <><span className="mx-1">·</span><strong className="text-foreground">A:{month.actual}{month.unit ? month.unit : ""}</strong></>}
          {monthPct !== null && (
            <span className={cn("ml-1 font-medium", monthIsRollup ? "text-muted-foreground" : statusColor(sk))}>
              {monthIsRollup ? `~${Math.round(monthPct)}%` : `${Math.round(monthPct)}%`}
            </span>
          )}
          {monthIsRollup
            ? <span className="ml-0.5 opacity-50 text-[10px]">({monthRollupCount}w avg)</span>
            : childCount > 0 && <span className="ml-1 opacity-60">· {childLabel}</span>
          }
        </span>
        <span className={cn("text-[10px] font-medium shrink-0 hidden sm:block", statusColor(sk))}>{meta.label}</span>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-0.5 text-muted-foreground"
              onClick={startAddWeek}>
              <Plus className="h-2.5 w-2.5" />Week
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => { setEv(blankEdit(month)); setEditing(e => !e); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive"
              onClick={() => setDelOpen(true)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <div className="px-3 pb-2">
          <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} compact />
        </div>
      )}

      {expanded && (
        <div className="pl-6 space-y-0.5 pb-1 border-l border-border/30 ml-4">
          {loadingWeeks && (
            <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground px-2">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
            </div>
          )}
          {!loadingWeeks && weeks.length === 0 && !addingWeek && (
            <p className="text-xs text-muted-foreground px-2 py-1.5 italic">
              No weeks yet.{" "}
              {canEdit && (
                <button type="button" className="text-primary hover:underline"
                  onClick={startAddWeek}>Add a week</button>
              )}
            </p>
          )}
          {/* Render children — could be weekly OR daily level (backward compat) */}
          {weeks.map(child =>
            child.level === "daily" ? (
              <DayRow key={child.id} day={child} canEdit={canEdit}
                onUpdated={upd => setWeeks(ws => ws.map(w => w.id === upd.id ? upd : w))}
                onDeleted={id => setWeeks(ws => ws.filter(w => w.id !== id))}
              />
            ) : (
              <WeekRow key={child.id} week={child} canEdit={canEdit} departmentKey={departmentKey}
                onUpdated={upd => setWeeks(ws => ws.map(w => w.id === upd.id ? upd : w))}
                onDeleted={id => setWeeks(ws => ws.filter(w => w.id !== id))}
              />
            )
          )}
          {addingWeek && (
            <div className="px-2 pb-1 pt-1">
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-widest mb-1.5">+ New Week</p>
              <EditForm v={addWeekEv} set={setAddWeekEv} onSave={handleAddWeek}
                onCancel={() => setAddingWeek(false)} saving={addWeekSaving} compact isNew />
            </div>
          )}
        </div>
      )}

      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Month"
        description={`Delete "${month.name}" and all its weeks and daily entries?`}
        onConfirm={handleDelete} deleting={deleting} />
    </>
  );
}

// ─── QUARTERLY CARD ───────────────────────────────────────────────────────────

function QuarterCard({
  quarter, canEdit, departmentKey, onUpdated, onDeleted,
}: {
  quarter: GoalNodeData; canEdit: boolean; departmentKey: string;
  onUpdated: (g: GoalNodeData) => void; onDeleted: (id: number) => void;
}) {
  const [goal, setGoal] = useState(quarter);
  const [months, setMonths] = useState<GoalNodeData[]>(quarter.children ?? []);
  const [showMonths, setShowMonths] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(quarter));
  const [saving, setSaving] = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);
  const [newMonth, setNewMonth] = useState(blankEdit());
  const [newMonthSaving, setNewMonthSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { pct, status: sk, isRollup: qIsRollup, rollupCount: qRollupCount } = displayStats(goal, months);
  const meta = STATUS_META[sk] ?? STATUS_META.none;

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(goal.id, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      const u = { ...goal, ...j.data } as GoalNodeData;
      setGoal(u); onUpdated(u); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(goal.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  const handleAddMonth = async () => {
    if (!newMonth.name.trim() || !newMonth.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setNewMonthSaving(true);
    try {
      const res = await createGoal(departmentKey, "monthly", goal.id, newMonth);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      setMonths(m => [...m, j.data as GoalNodeData]);
      setNewMonth(blankEdit()); setAddingMonth(false); setShowMonths(true);
      toast.success("Month added");
    } catch { toast.error("Error"); } finally { setNewMonthSaving(false); }
  };

  return (
    <>
      <div className={cn(
        "rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm border-l-4",
        sk === "green" ? "border-l-emerald-400" : sk === "yellow" ? "border-l-amber-400" : sk === "red" ? "border-l-red-400" : "border-l-border"
      )}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-mono mb-1.5", LEVEL_BADGE.quarterly)}>
                {goal.periodLabel}
              </Badge>
              <h4 className="font-semibold text-sm leading-tight">{goal.name}</h4>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-end gap-2 mb-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Actual</p>
              <p className="text-xl font-bold tabular-nums">
                {goal.actual
                  ? <>{goal.actual}{goal.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{goal.unit}</span>}</>
                  : qIsRollup
                    ? <span className="text-muted-foreground/60 text-base font-semibold">~{Math.round(pct!)}%</span>
                    : <span className="text-muted-foreground/40">—</span>}
              </p>
            </div>
            {goal.target && (
              <p className="text-xs text-muted-foreground mb-0.5">/ {goal.target}{goal.unit && ` ${goal.unit}`}</p>
            )}
            <div className="ml-auto flex items-center gap-1">
              {meta.icon}
              <span className={cn("text-[11px] font-medium", statusColor(sk))}>{meta.label}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
            <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
          </div>
          {pct !== null && (
            <p className="text-[10px] text-muted-foreground mb-3">
              {qIsRollup
                ? <span className="italic">~{Math.round(pct)}% avg · {qRollupCount} month{qRollupCount !== 1 ? "s" : ""}</span>
                : `${Math.round(pct)}%`
              }
            </p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowMonths(v => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              {showMonths ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {months.length} month{months.length !== 1 ? "s" : ""}
            </button>
            <div className="ml-auto flex items-center gap-1">
              {canEdit && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => { setNewMonth(blankChild(goal.periodLabel, "monthly", months.length)); setAddingMonth(true); setShowMonths(true); }}>
                    <Plus className="h-3 w-3" /> Month
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEv(blankEdit(goal)); setEditing(e => !e); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/50 hover:text-destructive"
                    onClick={() => setDelOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {editing && (
            <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} compact />
          )}
        </div>

        {/* Months section */}
        {showMonths && (
          <div className="border-t border-border/30 bg-muted/10 px-2 py-2 space-y-0.5">
            {months.length === 0 && !addingMonth && (
              <p className="text-xs text-muted-foreground text-center py-2 italic">
                No months yet.{" "}
                {canEdit && (
                  <button type="button" className="text-primary hover:underline"
                    onClick={() => { setNewMonth(blankChild(goal.periodLabel, "monthly", months.length)); setAddingMonth(true); }}>
                    Add one
                  </button>
                )}
              </p>
            )}
            {months.map(m => (
              <MonthRow key={m.id} month={m} canEdit={canEdit} departmentKey={departmentKey}
                onUpdated={u => setMonths(ms => ms.map(x => x.id === u.id ? u : x))}
                onDeleted={id => setMonths(ms => ms.filter(x => x.id !== id))}
              />
            ))}
            {addingMonth && (
              <div className="px-2 py-2">
                <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-widest mb-1.5">+ New Month</p>
                <EditForm v={newMonth} set={setNewMonth} onSave={handleAddMonth}
                  onCancel={() => setAddingMonth(false)} saving={newMonthSaving} compact isNew />
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Quarter"
        description={`Delete "${goal.name}" and all months, weeks, and daily entries?`}
        onConfirm={handleDelete} deleting={deleting} />
    </>
  );
}

// ─── RIGHT PANEL: selected yearly goal detail ─────────────────────────────────

function GoalDetail({
  goal: initialGoal, canEdit, departmentKey, onUpdated, onDeleted, onStatsComputed,
}: {
  goal: GoalNodeData; canEdit: boolean; departmentKey: string;
  onUpdated: (g: GoalNodeData) => void; onDeleted: (id: number) => void;
  onStatsComputed?: (goalId: number, stats: { pct: number | null; status: string; isRollup: boolean }) => void;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [quarters, setQuarters] = useState<GoalNodeData[]>(initialGoal.children ?? []);
  const [loadingQ, setLoadingQ] = useState(!initialGoal.children);
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(initialGoal));
  const [saving, setSaving] = useState(false);
  const [addingQ, setAddingQ] = useState(false);
  const [newQ, setNewQ] = useState(blankEdit());
  const [newQSaving, setNewQSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setGoal(initialGoal);
    setEv(blankEdit(initialGoal));
    setEditing(false);
    if (initialGoal.children) { setQuarters(initialGoal.children); setLoadingQ(false); return; }
    setLoadingQ(true);
    fetch(`/api/kpi/goals/${initialGoal.id}?full=true`)
      .then(r => r.json())
      .then(j => { if (j.data) { setGoal(j.data); setQuarters(j.data.children ?? []); } })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoadingQ(false));
  }, [initialGoal.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(goal.id, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      const u = { ...goal, ...j.data } as GoalNodeData;
      setGoal(u); onUpdated(u); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDeleteYearly = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(goal.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  const handleAddQuarter = async () => {
    if (!newQ.name.trim() || !newQ.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setNewQSaving(true);
    try {
      const res = await createGoal(departmentKey, "quarterly", goal.id, newQ);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      setQuarters(q => [...q, j.data as GoalNodeData]);
      setNewQ(blankEdit()); setAddingQ(false);
      toast.success("Quarter added");
    } catch { toast.error("Error"); } finally { setNewQSaving(false); }
  };

  const { pct, status: sk, isRollup: yIsRollup, rollupCount: yRollupCount } = displayStats(goal, quarters);
  const meta = STATUS_META[sk] ?? STATUS_META.none;

  // Propagate computed stats up to the rail whenever they change
  useEffect(() => {
    if (!loadingQ) onStatsComputed?.(goal.id, { pct, status: sk, isRollup: yIsRollup });
  }, [goal.id, pct, sk, yIsRollup, loadingQ]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Yearly header card */}
      <div className={cn(
        "rounded-xl border border-l-4 bg-card p-5",
        sk === "green" ? "border-l-emerald-400" : sk === "yellow" ? "border-l-amber-400" : sk === "red" ? "border-l-red-400" : "border-l-violet-300"
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-semibold", LEVEL_BADGE.yearly)}>Yearly</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground">{goal.periodLabel}</Badge>
            </div>
            <h2 className="text-xl font-bold">{goal.name}</h2>
            {goal.notes && <p className="text-sm text-muted-foreground mt-0.5 italic">{goal.notes}</p>}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              {!addingQ && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                  onClick={() => { setNewQ(blankChild(goal.periodLabel, "quarterly", quarters.length)); setAddingQ(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Quarter
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => { setEv(blankEdit(goal)); setEditing(e => !e); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive"
                onClick={() => setDelOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-end gap-6 mt-4 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              {yIsRollup ? "Avg Progress" : "Actual"}
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {goal.actual
                ? <>{goal.actual}{goal.unit && <span className="text-base font-normal text-muted-foreground ml-1">{goal.unit}</span>}</>
                : yIsRollup
                  ? <span className={cn(statusColor(sk))}>{Math.round(pct!)}%</span>
                  : <span className="text-muted-foreground/40 text-2xl">—</span>}
            </p>
          </div>
          {goal.target && !yIsRollup && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Target</p>
              <p className="text-lg text-muted-foreground tabular-nums">{goal.target}{goal.unit && ` ${goal.unit}`}</p>
            </div>
          )}
          {yIsRollup && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Source</p>
              <p className="text-sm text-muted-foreground italic">avg of {yRollupCount} quarter{yRollupCount !== 1 ? "s" : ""}</p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {meta.icon}
            <span className={cn("font-semibold text-sm", statusColor(sk))}>{meta.label}</span>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
          <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
        </div>
        {pct !== null && (
          <p className="text-[11px] text-muted-foreground">
            {yIsRollup
              ? <span className="italic">~{Math.round(pct)}% rolled up from quarters</span>
              : `${Math.round(pct)}% · ${goal.higherIsBetter ? "↑ higher is better" : "↓ lower is better"}`
            }
          </p>
        )}

        {editing && (
          <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        )}
      </div>

      {/* Add quarter form */}
      {addingQ && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 pt-3 pb-4">
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-2">+ New Quarter</p>
          <EditForm v={newQ} set={setNewQ} onSave={handleAddQuarter}
            onCancel={() => setAddingQ(false)} saving={newQSaving} compact isNew />
        </div>
      )}

      {/* Quarterly cards */}
      {loadingQ ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading quarters…
        </div>
      ) : quarters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-medium text-foreground">No quarterly goals yet</p>
          {canEdit && (
            <p className="text-sm mt-1">
              <button type="button" className="text-primary hover:underline"
                onClick={() => { setNewQ(blankEdit()); setAddingQ(true); }}>Add a quarter</button>
              {" "}to break this goal down.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quarters.map(q => (
            <QuarterCard key={q.id} quarter={q} canEdit={canEdit} departmentKey={departmentKey}
              onUpdated={u => setQuarters(qs => qs.map(x => x.id === u.id ? u : x))}
              onDeleted={id => setQuarters(qs => qs.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Action items */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button type="button" onClick={() => setActionsOpen(v => !v)}
          className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Action Items</span>
          {(goal._count?.actionItems ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground ml-0.5">({goal._count?.actionItems})</span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-auto transition-transform", actionsOpen && "rotate-180")} />
        </button>
        {actionsOpen && (
          <div className="border-t border-border/30 px-4 py-3">
            <KpiActionItemList goalId={goal.id} initialItems={goal.actionItems ?? []}
              canEdit={canEdit} defaultCollapsed={false} />
          </div>
        )}
      </div>

      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Yearly Goal"
        description={`Delete "${goal.name}" and ALL sub-goals?`}
        onConfirm={handleDeleteYearly} deleting={deleting} />
    </div>
  );
}

// ─── LEFT RAIL ────────────────────────────────────────────────────────────────

function GoalListItem({
  goal, selected, onClick, canEdit, onDeleted, derivedPct, derivedStatus, derivedIsRollup,
}: {
  goal: GoalNodeData; selected: boolean; onClick: () => void;
  canEdit: boolean; onDeleted: (id: number) => void;
  derivedPct?: number | null; derivedStatus?: string; derivedIsRollup?: boolean;
}) {
  const ownStats = displayStats(goal);
  const sk = derivedStatus ?? ownStats.status;
  const pct = derivedPct !== undefined ? derivedPct : ownStats.pct;
  const isRollup = derivedIsRollup ?? ownStats.isRollup;
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoal(goal.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col gap-1.5 px-3 py-3 rounded-lg cursor-pointer transition-colors border",
          selected ? "bg-primary/8 border-primary/30 shadow-sm" : "hover:bg-muted/50 border-transparent hover:border-border/50"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
          <span className="text-sm font-medium truncate flex-1">{goal.name}</span>
          {canEdit && (
            <button type="button"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
              onClick={e => { e.stopPropagation(); setDelOpen(true); }}>
              <Trash2 className="h-3 w-3 text-destructive/60" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pl-4">
          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{goal.periodLabel}</Badge>
          {goal.target && <span>T:{goal.target}{goal.unit ?? ""}</span>}
          {goal.actual && <strong className="text-foreground">A:{goal.actual}{goal.unit ?? ""}</strong>}
          {pct !== null && (
            <span className={cn("font-medium", isRollup ? "text-muted-foreground" : statusColor(sk))}>
              {isRollup ? `~${Math.round(pct)}%` : `${Math.round(pct)}%`}
            </span>
          )}
        </div>
        {pct !== null && (
          <div className="pl-4">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} title="Delete Goal"
        description={`Delete "${goal.name}" and all sub-goals?`}
        onConfirm={handleDelete} deleting={deleting} />
    </>
  );
}

// ─── MAIN SPLIT VIEW ──────────────────────────────────────────────────────────

export function KpiSplitView({ departmentKey, year, canEdit, onStatsChange }: KpiSplitViewProps) {
  const [goals, setGoals] = useState<GoalNodeData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [derivedStats, setDerivedStats] = useState<Map<number, { pct: number | null; status: string; isRollup: boolean }>>(new Map());

  const handleStatsComputed = useCallback((goalId: number, stats: { pct: number | null; status: string; isRollup: boolean }) => {
    setDerivedStats(prev => {
      const next = new Map(prev);
      next.set(goalId, stats);
      return next;
    });
  }, []);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/kpi/goals?department=${departmentKey}&year=${year}`);
      const j = await res.json();
      if (res.ok) {
        const data: GoalNodeData[] = j.data ?? [];
        setGoals(data);
        if (data.length > 0) setSelectedId(id => id ?? data[0].id);
        onStatsChange?.({
          total: data.length,
          green:  data.filter(g => displayStats(g).status === "green").length,
          yellow: data.filter(g => displayStats(g).status === "yellow").length,
          red:    data.filter(g => displayStats(g).status === "red").length,
        });
      } else { toast.error(j.error || "Failed"); }
    } catch { toast.error("Network error"); }
    finally { setIsLoading(false); }
  }, [departmentKey, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSelectedId(null); fetchGoals(); }, [fetchGoals]);

  const handleAddYearly = async () => {
    if (!newName.trim()) { toast.error("Name required"); return; }
    setNewSaving(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentKey, level: "yearly", parentId: null,
          name: newName.trim(), periodLabel: year, target: newTarget || null, higherIsBetter: true }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      const created = j.data as GoalNodeData;
      setGoals(gs => [...gs, created]);
      setSelectedId(created.id);
      setNewName(""); setNewTarget(""); setIsAdding(false);
      toast.success("Goal created");
    } catch { toast.error("Error"); } finally { setNewSaving(false); }
  };

  const handleUpdated = useCallback((updated: GoalNodeData) => {
    setGoals(gs => gs.map(g => g.id === updated.id ? { ...g, ...updated } : g));
  }, []);

  const handleDeleted = useCallback((id: number) => {
    setGoals(gs => {
      const next = gs.filter(g => g.id !== id);
      setSelectedId(prev => prev === id ? (next[0]?.id ?? null) : prev);
      return next;
    });
  }, []);

  const selectedGoal = goals.find(g => g.id === selectedId) ?? null;

  return (
    <div className="flex rounded-xl border border-border bg-card overflow-hidden" style={{ minHeight: 560 }}>
      {/* ── Left rail ─────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/20">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Target className="h-3.5 w-3.5" /> Yearly Goals
          </div>
          {canEdit && !isAdding && (
            <Button size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => { setNewName(""); setNewTarget(""); setIsAdding(true); }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {isAdding && (
          <div className="p-3 border-b border-border/50 space-y-2 bg-primary/5">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">New Yearly KPI</p>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Goal name" className="h-7 text-xs" autoFocus
              onKeyDown={e => e.key === "Enter" && handleAddYearly()} />
            <Input value={newTarget} onChange={e => setNewTarget(e.target.value)}
              placeholder="Target (optional)" className="h-7 text-xs" />
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => setIsAdding(false)} disabled={newSaving}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={handleAddYearly} disabled={newSaving}>
                <Check className="h-3 w-3" /> {newSaving ? "…" : "Add"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 px-2 text-xs text-muted-foreground">
              No goals for {year}.
              {canEdit && (
                <><br /><button type="button" className="text-primary hover:underline mt-1"
                  onClick={() => { setNewName(""); setIsAdding(true); }}>Add one</button></>
              )}
            </div>
          ) : (
            goals.map(g => {
              const ds = derivedStats.get(g.id);
              return (
                <GoalListItem key={g.id} goal={g} selected={g.id === selectedId}
                  onClick={() => setSelectedId(g.id)} canEdit={canEdit}
                  onDeleted={handleDeleted}
                  derivedPct={ds?.pct} derivedStatus={ds?.status} derivedIsRollup={ds?.isRollup} />
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      {selectedGoal ? (
        <GoalDetail key={selectedGoal.id} goal={selectedGoal} canEdit={canEdit}
          departmentKey={departmentKey} onUpdated={handleUpdated} onDeleted={handleDeleted}
          onStatsComputed={handleStatsComputed} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-5xl mb-3">📊</div>
            <p className="font-medium text-foreground">Select a goal from the left</p>
            <p className="text-sm mt-1">
              {canEdit ? "Or click + to add a new yearly goal." : "No goals yet."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
