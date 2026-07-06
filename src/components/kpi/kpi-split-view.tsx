"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, RefreshCw, CheckCircle2, AlertTriangle, TrendingDown, Clock,
  ListTodo, Target, BarChart2, Calendar, Activity,
  ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, Circle,
  CalendarDays, ArrowRight, FileText, Bell, CheckSquare, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, LineChart, Line,
  ResponsiveContainer, CartesianGrid, Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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

interface ParentGoalOption { id: number; name: string; periodLabel: string; }

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {
  dot: string; label: string; bar: string; icon: React.ReactNode;
  bg: string; border: string; text: string; lightBg: string;
}> = {
  green:  { dot: "bg-emerald-500", label: "On Track",  bar: "bg-emerald-500", icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: "bg-emerald-500",  border: "border-emerald-200", text: "text-emerald-600", lightBg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-400",   label: "At Risk",   bar: "bg-amber-400",   icon: <AlertTriangle className="h-3.5 w-3.5" />, bg: "bg-amber-400",   border: "border-amber-200",   text: "text-amber-600",   lightBg: "bg-amber-50"   },
  red:    { dot: "bg-red-500",     label: "Off Track", bar: "bg-red-500",     icon: <TrendingDown className="h-3.5 w-3.5" />, bg: "bg-red-500",     border: "border-red-200",     text: "text-red-600",     lightBg: "bg-red-50"     },
  none:   { dot: "bg-gray-300",    label: "Pending",   bar: "bg-gray-200",    icon: <Clock className="h-3.5 w-3.5" />, bg: "bg-gray-400",    border: "border-gray-200",    text: "text-gray-500",    lightBg: "bg-gray-50"    },
};

function statusColor(sk: string) {
  return sk === "green" ? "text-emerald-600" : sk === "yellow" ? "text-amber-600" : sk === "red" ? "text-red-600" : "text-gray-400";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Format a Date as a local YYYY-MM-DD string (never UTC-shifted). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function blankEdit(g?: GoalNodeData): EditValues {
  return { name: g?.name ?? "", periodLabel: g?.periodLabel ?? "", unit: g?.unit ?? "", target: g?.target ?? "", actual: g?.actual ?? "", higherIsBetter: g?.higherIsBetter ?? true, notes: g?.notes ?? "" };
}

function parseNum(v?: string | null) {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function ownPct(goal: GoalNodeData): number | null {
  const a = parseNum(goal.actual), t = parseNum(goal.target);
  if (a === null || t === null || t === 0) return null;
  const pct = goal.higherIsBetter ? (a / t) * 100 : (t / a) * 100;
  return Math.max(0, Math.min(pct, 150));
}

function rollupStats(children: GoalNodeData[]): { pct: number | null; count: number } {
  const vals = children.map(ownPct).filter((p): p is number => p !== null);
  if (vals.length === 0) return { pct: null, count: 0 };
  return { pct: vals.reduce((s, v) => s + v, 0) / vals.length, count: vals.length };
}

function displayStats(goal: GoalNodeData, children?: GoalNodeData[]): { pct: number | null; status: string; isRollup: boolean; rollupCount: number } {
  const p = ownPct(goal);
  if (p !== null) {
    const ratio = (parseNum(goal.actual) ?? 0) / (parseNum(goal.target) ?? 1);
    const status = goal.higherIsBetter ? (ratio >= 1.0 ? "green" : ratio >= 0.8 ? "yellow" : "red") : (ratio <= 1.0 ? "green" : ratio <= 1.2 ? "yellow" : "red");
    return { pct: p, status, isRollup: false, rollupCount: 0 };
  }
  if (children && children.length > 0) {
    const { pct, count } = rollupStats(children);
    if (pct !== null) { const status = pct >= 100 ? "green" : pct >= 80 ? "yellow" : "red"; return { pct, status, isRollup: true, rollupCount: count }; }
  }
  return { pct: null, status: "none", isRollup: false, rollupCount: 0 };
}

async function patchGoal(id: number, ev: EditValues, parentId?: number | null) {
  return fetch(`/api/kpi/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: ev.name.trim(), periodLabel: ev.periodLabel.trim(), unit: ev.unit || null, target: ev.target || null, actual: ev.actual || null, higherIsBetter: ev.higherIsBetter, notes: ev.notes || null, ...(parentId !== undefined ? { parentId } : {}) }) });
}

async function deleteGoalApi(id: number) { return fetch(`/api/kpi/goals/${id}`, { method: "DELETE" }); }

async function createGoalApi(departmentKey: string, level: string, parentId: number | null, ev: EditValues) {
  return fetch("/api/kpi/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentKey, level, parentId, name: ev.name.trim(), periodLabel: ev.periodLabel.trim(), target: ev.target || null, actual: ev.actual || null, unit: ev.unit || null, higherIsBetter: ev.higherIsBetter, notes: ev.notes || null }) });
}

function monthLabel(periodLabel: string) {
  const m = periodLabel.match(/(\d{4})-(\d{2})/);
  if (!m) return periodLabel;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[2]) - 1]} ${m[1]}`;
}

function weekLabel(periodLabel: string) {
  // "W2-2026-07" → "Jul · Wk 2"
  const m = periodLabel.match(/W(\d)-(\d{4})-(\d{2})/);
  if (!m) return periodLabel;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[3]) - 1]} · Wk ${m[1]}`;
}

function getCurrentPeriods(year: string) {
  const now = new Date();
  const m = now.getMonth() + 1;
  const q = Math.ceil(m / 3);
  const weekNum = Math.ceil(now.getDate() / 7);
  return {
    quarter: `Q${q}-${year}`,
    month: `${year}-${String(m).padStart(2, "0")}`,
    week: `W${weekNum}-${year}-${String(m).padStart(2, "0")}`,
    day: localDateStr(now),
  };
}

// ─── Period generators — always show all standard periods for the year ─────────

function buildQuarterOptions(year: string): { label: string; value: string }[] {
  return ["Q1", "Q2", "Q3", "Q4"].map(q => ({ label: `${q} ${year}`, value: `${q}-${year}` }));
}

function buildMonthOptions(year: string): { label: string; value: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const value = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { label: monthLabel(value), value };
  });
}

function buildWeekOptions(year: string): { label: string; value: string }[] {
  const now = new Date();
  const cy = now.getFullYear().toString();
  // For current year: generate up to current month; for other years: all 12 months
  const maxMonth = year === cy ? now.getMonth() + 1 : 12;
  const result: { label: string; value: string }[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    for (let w = 1; w <= 5; w++) {
      const value = `W${w}-${year}-${String(m).padStart(2, "0")}`;
      result.push({ label: weekLabel(value), value });
    }
  }
  return result;
}

/**
 * Normalise a period key into a sortable string so all formats sort
 * chronologically:
 *   W2-2026-07  →  2026-07-W2  (weekly: sort by year → month → week)
 *   2026-07     →  2026-07     (monthly: already sortable)
 *   Q3-2026     →  2026-Q3     (quarterly: sort by year → quarter)
 *   2026        →  2026        (yearly)
 */
function periodSortKey(v: string): string {
  const week = v.match(/^W(\d)-(\d{4})-(\d{2})$/);
  if (week) return `${week[2]}-${week[3]}-W${week[1]}`;
  const quarter = v.match(/^Q(\d)-(\d{4})$/);
  if (quarter) return `${quarter[2]}-Q${quarter[1]}`;
  return v;
}

/** Merge generated options with any extra periods from the DB, sorted chronologically */
function mergeOptions(
  generated: { label: string; value: string }[],
  fromDb: string[],
  labelFn: (v: string) => string,
): { label: string; value: string }[] {
  const seen = new Set(generated.map(o => o.value));
  const extras = fromDb.filter(v => !seen.has(v)).map(v => ({ label: labelFn(v), value: v }));
  return [...generated, ...extras].sort((a, b) =>
    periodSortKey(a.value).localeCompare(periodSortKey(b.value))
  );
}

// ─── Shared EditForm ──────────────────────────────────────────────────────────

function EditForm({
  v, set, onSave, onCancel, saving, isNew = false, level,
  parentGoals, selectedParentId, onParentChange,
}: {
  v: EditValues;
  set: (v: EditValues) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
  level?: string;
  /** @deprecated kept for call-site compatibility but no longer changes layout */
  compact?: boolean;
  parentGoals?: ParentGoalOption[];
  selectedParentId?: number | null;
  onParentChange?: (id: number | null) => void;
}) {
  const f = (k: keyof EditValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set({ ...v, [k]: e.target.value });

  // Guidance placeholder for the Period field, keyed by level
  const periodPlaceholder: Record<string, string> = {
    yearly: "e.g. 2026",
    quarterly: "e.g. Q1-2026",
    monthly: "e.g. 2026-07",
    weekly: "e.g. W2-2026-07",
    daily: "e.g. 2026-07-15",
  };

  const parentLevelLabel: Record<string, string> = {
    quarterly: "Yearly",
    monthly: "Quarterly",
    weekly: "Monthly",
  };
  const parentLabel = level ? parentLevelLabel[level] : null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      {/* Header */}
      <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
        {isNew ? `+ New${level ? ` ${level}` : ""} KPI Goal` : "✎ Edit KPI Goal"}
      </p>

      {/* Parent goal selector — for new and edit forms when parent options exist */}
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
              <option key={g.id} value={g.id}>
                {g.periodLabel} · {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Name — full width */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          value={v.name}
          onChange={f("name")}
          placeholder="e.g. Annual Revenue Growth"
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      {/* Period + Unit */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Period</label>
          <Input
            value={v.periodLabel}
            onChange={f("periodLabel")}
            placeholder={level ? periodPlaceholder[level] : "e.g. 2026"}
            className="h-8 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Unit</label>
          <Input
            value={v.unit}
            onChange={f("unit")}
            placeholder="%, Cr, Units…"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Target + Actual */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Target</label>
          <Input
            value={v.target}
            onChange={f("target")}
            placeholder="e.g. 100"
            inputMode="decimal"
            className="h-8 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Actual</label>
          <Input
            value={v.actual}
            onChange={f("actual")}
            placeholder="e.g. 85"
            inputMode="decimal"
            className="h-8 text-sm tabular-nums"
          />
        </div>
      </div>

      {/* Direction toggle */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Direction</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set({ ...v, higherIsBetter: true })}
            className={cn(
              "flex-1 h-8 text-xs rounded-md border font-medium transition-colors",
              v.higherIsBetter
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-background text-muted-foreground border-input hover:bg-muted",
            )}
          >
            ↑ Higher is better
          </button>
          <button
            type="button"
            onClick={() => set({ ...v, higherIsBetter: false })}
            className={cn(
              "flex-1 h-8 text-xs rounded-md border font-medium transition-colors",
              !v.higherIsBetter
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-muted-foreground border-input hover:bg-muted",
            )}
          >
            ↓ Lower is better
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Notes <span className="normal-case font-normal">(optional)</span></label>
        <Textarea
          value={v.notes}
          onChange={e => set({ ...v, notes: e.target.value })}
          placeholder="Context, methodology, or source of data…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
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

function DeleteDialog({ open, onOpenChange, title, description, onConfirm, deleting }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; onConfirm: () => void; deleting: boolean }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? "Deleting…" : "Delete"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Dashboard Metric Card ────────────────────────────────────────────────────

interface MetricCardProps {
  goal: GoalNodeData;
  level: "yearly" | "quarterly" | "monthly" | "weekly" | "daily";
  children?: GoalNodeData[];
  canEdit: boolean;
  onUpdated: (g: GoalNodeData) => void;
  onDeleted: (id: number) => void;
}

/** Left-border color by status — conveys health at a glance before reading numbers */
const STATUS_BORDER: Record<string, string> = {
  green:  "border-l-emerald-500",
  yellow: "border-l-amber-400",
  red:    "border-l-red-500",
  none:   "border-l-border",
};

function MetricCard({ goal: initialGoal, level, children: childProp, canEdit, onUpdated, onDeleted }: MetricCardProps) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(initialGoal));
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [nameExpanded, setNameExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const { pct, status: sk, isRollup } = displayStats(goal, childProp);
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const hasData = goal.actual !== null && goal.actual !== "" && goal.actual !== undefined;
  const actionCount = goal._count?.actionItems ?? 0;

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
      const res = await deleteGoalApi(goal.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  // What to show as the "actual" value in the card body
  const actualDisplay = hasData
    ? goal.actual!
    : isRollup && pct !== null
      ? `${Math.round(pct)}%`
      : null;

  const progressPct = Math.min(pct ?? 0, 100);

  return (
    <>
      <div className={cn(
        "group relative bg-card border border-l-[3px] rounded-xl overflow-hidden",
        "flex flex-col transition-all hover:shadow-md",
        STATUS_BORDER[sk] ?? STATUS_BORDER.none,
      )}>
        {/* ── Name + controls ──────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              {/* Status dot */}
              <span className={cn("mt-[5px] h-2 w-2 rounded-full shrink-0", meta.dot)} />
              <button
                type="button"
                onClick={() => setNameExpanded(e => !e)}
                className="text-left min-w-0"
                title={nameExpanded ? "Click to collapse" : "Click to expand"}
              >
                <h3 className={cn(
                  "text-sm font-semibold text-foreground leading-snug",
                  !nameExpanded && "line-clamp-2",
                )}>
                  {goal.name}
                </h3>
                {!nameExpanded && goal.name.length > 60 && (
                  <span className="text-[10px] text-primary hover:underline mt-0.5 block">show more</span>
                )}
              </button>
            </div>
            {canEdit && (
              <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                <Button
                  size="icon" variant="ghost" className="h-6 w-6"
                  title="Edit goal"
                  onClick={() => { setEv(blankEdit(goal)); setEditing(e => !e); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-6 w-6 text-destructive/40 hover:text-destructive"
                  title="Delete goal"
                  onClick={() => setDelOpen(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Period + unit */}
          <p className="text-[10px] text-muted-foreground mt-1 pl-4">
            {goal.periodLabel}
            {goal.unit ? <> &middot; <span className="font-medium">{goal.unit}</span></> : null}
          </p>

          {/* Notes — shown inline, expandable */}
          {goal.notes && (
            <div className="mt-2 pl-4">
              <button
                type="button"
                onClick={() => setNotesExpanded(e => !e)}
                className="text-left w-full"
              >
                <p className={cn(
                  "text-[11px] text-muted-foreground leading-relaxed",
                  !notesExpanded && "line-clamp-2",
                )}>
                  {goal.notes}
                </p>
                {goal.notes.length > 100 && (
                  <span className="text-[10px] text-primary hover:underline mt-0.5 block">
                    {notesExpanded ? "show less" : "show more"}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Actual vs Target ─────────────────────────────────────────── */}
        <div className="mx-4 mb-3 grid grid-cols-2 divide-x divide-border/40 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Actual</p>
            {actualDisplay !== null ? (
              <p className={cn("text-xl font-bold tabular-nums leading-none", sk !== "none" ? meta.text : "text-foreground")}>
                {actualDisplay}
                {hasData && goal.unit && (
                  <span className="text-[11px] font-normal text-muted-foreground ml-0.5">{goal.unit}</span>
                )}
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
                {goal.unit && (
                  <span className="text-[11px] font-normal text-muted-foreground ml-0.5">{goal.unit}</span>
                )}
              </p>
            ) : (
              <p className="text-xl font-bold leading-none text-muted-foreground/30">—</p>
            )}
          </div>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        <div className="px-4 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">
              {isRollup ? "Avg. progress" : "Progress"}
            </span>
            <span className={cn("text-xs font-bold tabular-nums", sk !== "none" ? meta.text : "text-muted-foreground")}>
              {pct !== null ? `${Math.round(pct)}%` : "—"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", meta.bar)}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Status + direction ───────────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
            meta.lightBg, meta.border, meta.text,
          )}>
            {meta.icon}
            {meta.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {goal.higherIsBetter ? "↑ Higher" : "↓ Lower"} is better
          </span>
        </div>

        {/* ── Action items toggle ──────────────────────────────────────── */}
        <div className="border-t border-border/30">
          <button
            type="button"
            onClick={() => setShowActions(v => !v)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-expanded={showActions}
          >
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Action Items</span>
            {actionCount > 0 ? (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold text-foreground">
                {actionCount}
              </span>
            ) : null}
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

        {/* ── Inline edit form ─────────────────────────────────────────── */}
        {editing && (
          <div className="px-4 pb-4 pt-1">
            <EditForm v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} level={level} />
          </div>
        )}
      </div>

      <DeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Delete Goal"
        description={`Delete "${goal.name}" and all its sub-goals and action items?`}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </>
  );
}

// ─── Add Goal Form ────────────────────────────────────────────────────────────

function AddGoalInline({ level, periodLabel, departmentKey, parentId, parentGoals, onAdded, onCancel }: { level: string; periodLabel: string; departmentKey: string; parentId: number | null; parentGoals?: ParentGoalOption[]; onAdded: (g: GoalNodeData) => void; onCancel: () => void }) {
  const [ev, setEv] = useState<EditValues>({ name: "", periodLabel, unit: "", target: "", actual: "", higherIsBetter: true, notes: "" });
  const [saving, setSaving] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentId);

  const handleSave = async () => {
    if (!ev.name.trim() || !ev.periodLabel.trim()) { toast.error("Name and period required"); return; }
    setSaving(true);
    try {
      const res = await createGoalApi(departmentKey, level, selectedParentId, ev);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      onAdded(j.data as GoalNodeData); toast.success("Created");
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  return (
    <div>
      <EditForm
        v={ev} set={setEv} onSave={handleSave} onCancel={onCancel} saving={saving} isNew level={level}
        parentGoals={parentGoals} selectedParentId={selectedParentId} onParentChange={setSelectedParentId}
      />
    </div>
  );
}

// ─── Compact Goal Row (Monthly & Quarterly sections) ─────────────────────────

const COMPACT_LEFT_BORDER: Record<string, string> = {
  green:  "border-emerald-500",
  yellow: "border-amber-400",
  red:    "border-red-500",
  none:   "border-border/40",
};

function GoalStatusSummary({ goals }: { goals: GoalNodeData[] }) {
  const counts = goals.reduce((acc, g) => {
    const sk = displayStats(g).status;
    acc[sk] = (acc[sk] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Object.entries(counts).map(([sk, cnt]) => {
        const m = STATUS_META[sk] ?? STATUS_META.none;
        return (
          <span key={sk} className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
            m.lightBg, m.border, m.text,
          )}>
            {cnt} {m.label}
          </span>
        );
      })}
    </div>
  );
}

function CompactGoalRow({ goal: initialGoal, level, canEdit, onUpdated, onDeleted, parentGoals }: {
  goal: GoalNodeData;
  level: "quarterly" | "monthly" | "weekly";
  canEdit: boolean;
  onUpdated: (g: GoalNodeData) => void;
  onDeleted: (id: number) => void;
  parentGoals?: ParentGoalOption[];
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ev, setEv] = useState(blankEdit(initialGoal));
  const [selectedParentId, setSelectedParentId] = useState<number | null>(initialGoal.parentId ?? null);
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { pct, status: sk } = displayStats(goal);
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  const hasData = goal.actual !== null && goal.actual !== "" && goal.actual !== undefined;
  const progressPct = Math.min(pct ?? 0, 100);
  const actualDisplay = hasData ? goal.actual! : pct !== null ? `${Math.round(pct)}%` : null;
  const actionCount = goal._count?.actionItems ?? 0;

  const handleSave = async () => {
    if (!ev.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await patchGoal(goal.id, ev, selectedParentId);
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      const u = { ...goal, ...j.data } as GoalNodeData;
      setGoal(u); onUpdated(u); toast.success("Saved"); setEditing(false);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteGoalApi(goal.id);
      if (!res.ok) { toast.error("Failed"); return; }
      onDeleted(goal.id); toast.success("Deleted");
    } catch { toast.error("Error"); } finally { setDeleting(false); setDelOpen(false); }
  };

  return (
    <>
      <div className={cn("group border-l-2", COMPACT_LEFT_BORDER[sk] ?? COMPACT_LEFT_BORDER.none)}>
        {/* ── Compact summary row ──────────────────────────────────── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (!editing) setExpanded(e => !e); }}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !editing) setExpanded(v => !v); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors text-left cursor-pointer"
        >
          <span className={cn("h-2 w-2 rounded-full shrink-0 mt-px", meta.dot)} />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[13px] font-medium text-foreground leading-snug truncate">{goal.name}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-300", meta.bar)} style={{ width: `${progressPct}%` }} />
              </div>
              <span className={cn("text-[11px] font-bold tabular-nums shrink-0 w-8 text-right", sk !== "none" ? meta.text : "text-muted-foreground")}>
                {pct !== null ? `${Math.round(pct)}%` : "—"}
              </span>
            </div>
          </div>
          {/* Actual / Target */}
          <div className="shrink-0 text-right min-w-[56px]">
            {actualDisplay ? (
              <>
                <p className={cn("text-[13px] font-bold tabular-nums leading-snug", sk !== "none" ? meta.text : "text-foreground")}>
                  {actualDisplay}
                  {hasData && goal.unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{goal.unit}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  / {goal.target ?? "—"}{goal.unit ? ` ${goal.unit}` : ""}
                </p>
              </>
            ) : (
              <p className="text-[13px] font-bold text-muted-foreground/30">—</p>
            )}
          </div>
          {/* Edit / Delete — visible on row hover */}
          {canEdit && (
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => { setEv(blankEdit(goal)); setSelectedParentId(goal.parentId ?? null); setEditing(e => !e); setExpanded(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost"
                className="h-6 w-6 text-destructive/40 hover:text-destructive"
                onClick={() => setDelOpen(true)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
            expanded && "rotate-180",
          )} />
        </div>

        {/* ── Expanded detail panel ────────────────────────────────── */}
        {expanded && !editing && (
          <div className="px-4 pb-3 pt-2 space-y-2 bg-muted/10 border-t border-border/20">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                meta.lightBg, meta.border, meta.text,
              )}>
                {meta.icon} {meta.label}
              </span>
              {goal.periodLabel && (
                <span className="text-[10px] text-muted-foreground font-mono">{goal.periodLabel}</span>
              )}
              {goal.unit && (
                <span className="text-[10px] text-muted-foreground">
                  Unit: <span className="font-medium">{goal.unit}</span>
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {goal.higherIsBetter ? "↑ Higher" : "↓ Lower"} is better
              </span>
            </div>
            {goal.notes && (
              <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-2 italic">
                {goal.notes}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowActions(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ListTodo className="h-3 w-3 shrink-0" />
              <span>Action Items</span>
              {actionCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold text-foreground">
                  {actionCount}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showActions && "rotate-180")} />
            </button>
            {showActions && (
              <div className="pt-1">
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
        )}

        {/* ── Inline edit form ─────────────────────────────────────── */}
        {editing && (
          <div className="px-3 pb-3 pt-2 bg-muted/10 border-t border-border/20">
            <EditForm
              v={ev} set={setEv} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} level={level}
              parentGoals={parentGoals} selectedParentId={selectedParentId} onParentChange={setSelectedParentId}
            />
          </div>
        )}
      </div>

      <DeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Delete Goal"
        description={`Delete "${goal.name}" and all its sub-goals and action items?`}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  number?: number;
  title: string;
  badge?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ icon, number, title, badge, rightSlot, children, className }: SectionCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {number !== undefined && (
              <span className="text-sm font-bold text-foreground">{number}.</span>
            )}
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge}
          </div>
        </div>
        {rightSlot && <div className="shrink-0 ml-3">{rightSlot}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

function PeriodSelector({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-7 pl-2.5 pr-6 text-xs font-medium rounded-md border border-border bg-background text-foreground cursor-pointer hover:bg-muted transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Monthly breakdown row (used in Quarterly section) ───────────────────────

function MonthProgressRow({ label, pct, sk }: { label: string; pct: number | null; sk: string }) {
  const meta = STATUS_META[sk] ?? STATUS_META.none;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
      </div>
      <span className={cn("text-sm font-bold w-10 text-right tabular-nums shrink-0", meta.text)}>
        {pct !== null ? `${Math.round(pct)}%` : "—"}
      </span>
    </div>
  );
}

// ─── TODAY'S TASKS ────────────────────────────────────────────────────────────

// ─── Task Form Dialog ─────────────────────────────────────────────────────────

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "new" | "edit";
  selectedDay?: string;
  weeklyGoals?: GoalNodeData[];
  loadingGoals?: boolean;
  departmentKey?: string;
  row?: ActionItemRow | null;
  onCreated?: (row: ActionItemRow) => void;
  onUpdated?: (row: ActionItemRow) => void;
}

function TaskFormDialog({
  open, onOpenChange, mode,
  selectedDay, weeklyGoals = [], loadingGoals = false, departmentKey = "",
  row, onCreated, onUpdated,
}: TaskFormDialogProps) {
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fGoalId, setFGoalId] = useState("");
  const [fTarget, setFTarget] = useState("");
  const [fActual, setFActual] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fDueDate, setFDueDate] = useState("");
  const [fDueTime, setFDueTime] = useState("");
  const [fStatus, setFStatus] = useState("open");
  const [fNotes, setFNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && row) {
      setFTitle(row.title ?? "");
      setFDescription(row.description ?? "");
      setFGoalId(String(row.goalId));
      setFTarget(row.target ?? "");
      setFActual(row.actual ?? "");
      setFOwner(row.owner ?? "");
      setFStatus(row.status ?? "open");
      setFNotes(row.notes ?? "");
      if (row.dueDate) {
        const d = new Date(row.dueDate as string);
        setFDueDate(localDateStr(d));
        setFDueTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      } else {
        setFDueDate(""); setFDueTime("");
      }
    } else {
      setFTitle(""); setFDescription(""); setFGoalId("");
      setFTarget(""); setFActual(""); setFOwner("");
      setFDueDate(selectedDay ?? ""); setFDueTime("");
      setFStatus("open"); setFNotes("");
    }
  }, [open, mode, row, selectedDay]);

  const handleSubmit = async () => {
    if (!fTitle.trim()) { toast.error("Task title is required"); return; }
    if (mode === "new" && !fGoalId) { toast.error("Please select a weekly KPI goal"); return; }
    setSaving(true);
    try {
      // Build dueDate from the user's LOCAL date + time (not UTC-stamped).
      const dueDateStr = fDueDate
        ? (() => {
            const [y, mo, d] = fDueDate.split("-").map(Number);
            const [h, min] = (fDueTime || "00:00").split(":").map(Number);
            return new Date(y, mo - 1, d, h, min, 0).toISOString();
          })()
        : null;

      if (mode === "new") {
        const res = await fetch(`/api/kpi/goals/${fGoalId}/action-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: fTitle.trim(),
            description: fDescription || null,
            target: fTarget || null,
            actual: fActual || null,
            owner: fOwner || null,
            dueDate: dueDateStr ?? (selectedDay
              ? (() => { const [y, mo, d] = selectedDay.split("-").map(Number); return new Date(y, mo - 1, d, 0, 0, 0).toISOString(); })()
              : null),
            status: fStatus,
            notes: fNotes || null,
          }),
        });
        const j = await res.json();
        if (!res.ok) { toast.error(j.error || "Failed to create task"); return; }
        const wg = weeklyGoals.find(g => g.id === Number(fGoalId));
        const deptLabel = departmentKey.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const newRow: ActionItemRow = {
          id: j.data.id, title: j.data.title, description: j.data.description,
          target: j.data.target, actual: j.data.actual, notes: j.data.notes,
          goalName: wg?.name ?? "—", deptName: deptLabel, status: j.data.status,
          owner: j.data.owner, dueDate: j.data.dueDate, goalId: Number(fGoalId),
        };
        onCreated?.(newRow);
        toast.success("Task created");
      } else if (row) {
        const newGoalId = fGoalId ? Number(fGoalId) : row.goalId;
        const res = await fetch(`/api/kpi/action-items/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: fTitle.trim(),
            description: fDescription || null,
            target: fTarget || null,
            actual: fActual || null,
            owner: fOwner || null,
            dueDate: dueDateStr,
            status: fStatus,
            notes: fNotes || null,
            goalId: newGoalId,
          }),
        });
        const j = await res.json();
        if (!res.ok) { toast.error(j.error || "Failed to update task"); return; }
        const linkedGoal = weeklyGoals.find(g => g.id === newGoalId);
        const updated: ActionItemRow = {
          ...row,
          title: j.data.title, description: j.data.description,
          target: j.data.target, actual: j.data.actual, notes: j.data.notes,
          owner: j.data.owner, dueDate: j.data.dueDate, status: j.data.status,
          goalId: newGoalId,
          goalName: linkedGoal?.name ?? row.goalName,
        };
        onUpdated?.(updated);
        toast.success("Task updated");
      }
      onOpenChange(false);
    } catch { toast.error("An unexpected error occurred"); } finally { setSaving(false); }
  };

  const selectedDateLabel = selectedDay
    ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : "";

  const inputCls = "text-sm h-9";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        {/* ── Sticky header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 bg-muted/20 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base leading-none">
            {mode === "new" ? (
              <>
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 shrink-0">
                  <Plus className="h-4 w-4" />
                </span>
                <span>
                  New Task
                  {selectedDateLabel && (
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">— {selectedDateLabel}</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </span>
                <span>Edit Task</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-[11px] mt-1 ml-[42px]">
            {mode === "new"
              ? "Create a new action item and link it to a weekly KPI goal."
              : "Update task details, metrics, and assignment."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Task Details */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
              Task Details
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  placeholder="e.g. Follow up with client on Q3 revenue target"
                  className={inputCls}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                  Description <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                </label>
                <Textarea
                  value={fDescription}
                  onChange={e => setFDescription(e.target.value)}
                  placeholder="Steps, blockers, links, or extra context…"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </section>

          {/* KPI Goal Linkage */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
              KPI Goal Linkage
            </p>
            <div>
              <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                Weekly Goal
                {mode === "new" && <span className="text-destructive ml-0.5">*</span>}
                {mode === "edit" && <span className="text-muted-foreground/50 normal-case font-normal ml-1">(change to re-link)</span>}
              </label>
              <select
                value={fGoalId}
                onChange={e => setFGoalId(e.target.value)}
                disabled={loadingGoals}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">
                  {loadingGoals ? "Loading goals…" : (mode === "new" ? "— Select a weekly KPI goal —" : "— No goal linked —")}
                </option>
                {!loadingGoals && weeklyGoals.length === 0 && (
                  <option disabled>No weekly goals — create one in &quot;This Week&apos;s Progress&quot; first</option>
                )}
                {weeklyGoals.map(g => (
                  <option key={g.id} value={String(g.id)}>
                    {weekLabel(g.periodLabel)} · {g.name}
                  </option>
                ))}
              </select>
              {!loadingGoals && weeklyGoals.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {weeklyGoals.length} weekly goal{weeklyGoals.length !== 1 ? "s" : ""} available for this year
                </p>
              )}
            </div>
          </section>

          {/* Metrics */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
              Metrics
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                  Target <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                </label>
                <Input
                  value={fTarget}
                  onChange={e => setFTarget(e.target.value)}
                  placeholder="e.g. 10 calls"
                  inputMode="decimal"
                  className={cn(inputCls, "tabular-nums")}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                  Actual <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                </label>
                <Input
                  value={fActual}
                  onChange={e => setFActual(e.target.value)}
                  placeholder="e.g. 8 calls"
                  inputMode="decimal"
                  className={cn(inputCls, "tabular-nums")}
                />
              </div>
            </div>
            {/* Mini progress hint */}
            {fTarget && fActual && (() => {
              const t = parseFloat(fTarget); const a = parseFloat(fActual);
              if (!isNaN(t) && !isNaN(a) && t > 0) {
                const pct = Math.round((a / t) * 100);
                const cls = pct >= 100 ? "text-emerald-600" : pct >= 80 ? "text-amber-600" : "text-red-600";
                return (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full bg-current transition-all", cls)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className={cn("text-[11px] font-bold tabular-nums", cls)}>{pct}%</span>
                  </div>
                );
              }
              return null;
            })()}
          </section>

          {/* Assignment & Schedule */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
              Assignment &amp; Schedule
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                    Owner <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                  </label>
                  <Input
                    value={fOwner}
                    onChange={e => setFOwner(e.target.value)}
                    placeholder="e.g. Priya S."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                    Status
                  </label>
                  <select
                    value={fStatus}
                    onChange={e => setFStatus(e.target.value)}
                    className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={fDueDate}
                    onChange={e => setFDueDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide block mb-1.5">
                    Due Time
                  </label>
                  <Input
                    type="time"
                    value={fDueTime}
                    onChange={e => setFDueTime(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
              Notes
            </p>
            <Textarea
              value={fNotes}
              onChange={e => setFNotes(e.target.value)}
              placeholder="Additional context, follow-up actions, or blockers…"
              rows={3}
              className="resize-none text-sm"
            />
          </section>

        </div>

        {/* ── Sticky footer ── */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              "min-w-[110px]",
              mode === "new" ? "bg-blue-600 hover:bg-blue-700" : "",
            )}
          >
            {saving
              ? (mode === "new" ? "Creating…" : "Saving…")
              : (mode === "new" ? "Create Task" : "Update Task")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActionItemRow {
  id: number;
  title: string;
  description?: string | null;
  target?: string | null;
  actual?: string | null;
  notes?: string | null;
  goalName: string;
  deptName: string;
  status: string;
  owner?: string | null;
  dueDate?: string | Date | null;
  goalId: number;
  goalStatus?: string | null;
  overdueDay?: string;
}

type AiRaw = {
  id: number; title: string; status: string;
  description?: string | null; target?: string | null; actual?: string | null; notes?: string | null;
  owner?: string | null; dueDate?: string | null;
};

function aiToRow(ai: AiRaw, goal: GoalNodeData, deptLabel: string): ActionItemRow {
  return {
    id: ai.id,
    title: ai.title,
    description: ai.description,
    target: ai.target,
    actual: ai.actual,
    notes: ai.notes,
    goalName: goal.name,
    deptName: deptLabel,
    status: ai.status,
    owner: ai.owner,
    dueDate: ai.dueDate,
    goalId: goal.id,
    goalStatus: displayStats(goal).status,
  };
}

function formatDueTime(date?: string | Date | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return "—"; }
}

function getPriorityStyle(p: string) {
  if (p === "High") return "text-red-600 bg-red-50";
  if (p === "Medium") return "text-orange-500 bg-orange-50";
  return "text-green-600 bg-green-50";
}

// Derive a display priority from the goal's status
function derivePriority(goalStatus?: string | null) {
  if (goalStatus === "red") return "High";
  if (goalStatus === "yellow") return "Medium";
  return "Medium";
}

const AI_STATUS: Record<string, { label: string; cls: string }> = {
  open:          { label: "Pending",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  "in-progress": { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  done:          { label: "Done",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blocked:       { label: "Blocked",     cls: "bg-red-50 text-red-700 border-red-200" },
};

function TodaysTasksSection({ goals: _goals, canEdit, departmentKey, year }: { goals: GoalNodeData[]; canEdit: boolean; departmentKey: string; year: string }) {
  const router = useRouter();
  const [todayStr] = useState(() => localDateStr(new Date()));

  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [rows, setRows] = useState<ActionItemRow[]>([]);
  const [overdueRows, setOverdueRows] = useState<ActionItemRow[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalNodeData[]>([]);
  const [loading, setLoading] = useState(false);

  // Unified task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<"new" | "edit">("new");
  const [taskDialogRow, setTaskDialogRow] = useState<ActionItemRow | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Re-fetch weekly goals whenever the task dialog opens (keeps the selector fresh)
  useEffect(() => {
    if (!taskDialogOpen) return;
    setLoadingGoals(true);
    fetch(`/api/kpi/goals?department=${departmentKey}&level=weekly`)
      .then(r => r.json())
      .then(j => {
        const all: GoalNodeData[] = j.data ?? [];
        setWeeklyGoals(all.filter(g => g.periodLabel.includes(year)));
      })
      .catch(() => {})
      .finally(() => setLoadingGoals(false));
  }, [taskDialogOpen, departmentKey, year]);

  const loadData = useCallback(async (day: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const deptLabel = departmentKey.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      const [dailyRes, weeklyRes] = await Promise.all([
        fetch(`/api/kpi/goals?department=${departmentKey}&level=daily`),
        fetch(`/api/kpi/goals?department=${departmentKey}&level=weekly`),
      ]);
      const [dailyJ, weeklyJ] = await Promise.all([dailyRes.json(), weeklyRes.json()]);

      const allDaily: GoalNodeData[] = dailyJ.data ?? [];
      const allWeekly: GoalNodeData[] = weeklyJ.data ?? [];
      const thisYearWeekly = allWeekly.filter(g => g.periodLabel.includes(year));
      setWeeklyGoals(thisYearWeekly);

      // Daily goals matching selected day
      const dayGoals = allDaily.filter(g => g.periodLabel === day);

      // Fetch action items for daily goals + ALL this-year weekly goals in parallel.
      // We check all weekly goals (not just the current week) so tasks due on any
      // future/past date show up regardless of which weekly goal they were linked to.
      const [dailyResults, weeklyGoalData] = await Promise.all([
        Promise.all(
          dayGoals.map(g =>
            fetch(`/api/kpi/goals/${g.id}`)
              .then(r => r.json())
              .then(j2 => ({ goal: g, items: (j2.data?.actionItems ?? []) as AiRaw[] }))
              .catch(() => ({ goal: g, items: [] as AiRaw[] }))
          )
        ),
        Promise.all(
          thisYearWeekly.map(g =>
            fetch(`/api/kpi/goals/${g.id}`)
              .then(r => r.json())
              .then(j2 => ({ goal: g, items: (j2.data?.actionItems ?? []) as AiRaw[] }))
              .catch(() => ({ goal: g, items: [] as AiRaw[] }))
          )
        ),
      ]);

      // Build today's rows (deduplicated by id)
      const seen = new Set<number>();
      const todayRows: ActionItemRow[] = [];

      for (const { goal, items } of dailyResults) {
        for (const ai of items) {
          if (!seen.has(ai.id)) { seen.add(ai.id); todayRows.push(aiToRow(ai, goal, deptLabel)); }
        }
      }
      // Weekly goal action items where dueDate === selected day
      for (const { goal, items } of weeklyGoalData) {
        for (const ai of items) {
          if (!seen.has(ai.id) && ai.dueDate) {
            const aiDay = localDateStr(new Date(ai.dueDate));
            if (aiDay === day) { seen.add(ai.id); todayRows.push(aiToRow(ai, goal, deptLabel)); }
          }
        }
      }
      setRows(todayRows);

      // Overdue tasks — only compute when viewing today
      if (day === todayStr) {
        const today = new Date(todayStr + "T00:00:00");
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = localDateStr(sevenDaysAgo);

        const prevDayGoals = allDaily.filter(g => g.periodLabel >= sevenDaysAgoStr && g.periodLabel < day);
        const prevResults = await Promise.all(
          prevDayGoals.slice(0, 10).map(g =>
            fetch(`/api/kpi/goals/${g.id}`)
              .then(r => r.json())
              .then(j2 => ({ goal: g, items: (j2.data?.actionItems ?? []) as AiRaw[] }))
              .catch(() => ({ goal: g, items: [] as AiRaw[] }))
          )
        );

        const overdueList: ActionItemRow[] = [];
        const overdueIds = new Set<number>(todayRows.map(r => r.id));

        // Overdue from previous daily goals
        for (const { goal, items } of prevResults) {
          for (const ai of items) {
            if (!overdueIds.has(ai.id) && ai.status !== "done") {
              overdueIds.add(ai.id);
              overdueList.push({ ...aiToRow(ai, goal, deptLabel), overdueDay: goal.periodLabel });
            }
          }
        }
        // Overdue from weekly goal items with a past dueDate
        for (const { goal, items } of weeklyGoalData) {
          for (const ai of items) {
            if (!overdueIds.has(ai.id) && ai.status !== "done" && ai.dueDate) {
              const aiDay = localDateStr(new Date(ai.dueDate));
              if (aiDay < day) {
                overdueIds.add(ai.id);
                overdueList.push({ ...aiToRow(ai, goal, deptLabel), overdueDay: aiDay });
              }
            }
          }
        }
        setOverdueRows(overdueList);
      } else {
        setOverdueRows([]);
      }
    } catch (e) { console.error(e); } finally { if (!quiet) setLoading(false); }
  }, [departmentKey, year, todayStr]);

  useEffect(() => { loadData(selectedDay); }, [selectedDay, loadData]);

  const navigateDay = (dir: -1 | 1) => {
    setSelectedDay(prev => {
      const [y, m, d] = prev.split("-").map(Number);
      return localDateStr(new Date(y, m - 1, d + dir));
    });
  };

  const handleMarkDone = async (row: ActionItemRow) => {
    try {
      await fetch(`/api/kpi/action-items/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) });
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, status: "done" } : r));
      setOverdueRows(rs => rs.filter(r => r.id !== row.id));
      toast.success("Marked done");
    } catch { toast.error("Error"); }
  };

  const openEdit = (row: ActionItemRow) => {
    setTaskDialogRow(row);
    setTaskDialogMode("edit");
    setTaskDialogOpen(true);
  };

  const pendingCount = rows.filter(r => r.status === "open" || r.status === "in-progress").length;
  const completedCount = rows.filter(r => r.status === "done").length;
  const isToday = selectedDay === todayStr;

  // Day display labels
  const selectedDate = new Date(selectedDay + "T00:00:00");
  const todayDate = new Date(todayStr + "T00:00:00");
  const dayDiff = Math.round((todayDate.getTime() - selectedDate.getTime()) / 86400000);
  const dayLabel = dayDiff === 0 ? "Today" : dayDiff === 1 ? "Yesterday" : dayDiff === -1 ? "Tomorrow" : selectedDate.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  const dayBadge = selectedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tasks table — 2/3 */}
      <div id="kpi-today-tasks" className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">1. TODAY&apos;S TASKS</span>
            {/* Day navigation */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navigateDay(-1)}
                className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <Badge className={cn(
                "text-[10px] font-mono cursor-default",
                isToday ? "bg-blue-600 text-white border-0" : "bg-muted text-foreground border border-border"
              )}>
                {dayLabel} · {dayBadge}
              </Badge>
              {!isToday && (
                <button onClick={() => setSelectedDay(todayStr)} className="text-[10px] text-primary hover:underline font-medium ml-1">
                  Today
                </button>
              )}
              <button
                onClick={() => navigateDay(1)}
                className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center transition-colors ml-0.5"
                title="Next day"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{pendingCount} Pending</Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">{rows.length} Total</Badge>
            {overdueRows.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{overdueRows.length} Overdue</Badge>
            )}
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => { setTaskDialogMode("new"); setTaskDialogRow(null); setTaskDialogOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading tasks…
          </div>
        ) : (
          <>
            {/* Overdue section — only when viewing today */}
            {isToday && overdueRows.length > 0 && (
              <div id="kpi-overdue-tasks" className="border-b border-red-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50/80">
                  <Clock className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Overdue from previous days ({overdueRows.length})
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-red-50">
                    {overdueRows.map(row => {
                      const statusCfg = AI_STATUS[row.status] ?? AI_STATUS.open;
                      return (
                        <tr key={`od-${row.id}`} className="hover:bg-red-50/30 transition-colors">
                          <td className="py-2 px-3 w-6">
                            <input type="checkbox" checked={false} readOnly className="h-3.5 w-3.5 rounded border-red-300" />
                          </td>
                          <td className="py-2 px-2">
                            <p className="font-medium text-foreground text-xs line-clamp-1">{row.title}</p>
                            {row.overdueDay && (
                              <p className="text-[10px] text-red-500">
                                Due {new Date(row.overdueDay + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground max-w-[120px]">
                            <span className="line-clamp-1">{row.goalName}</span>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5", statusCfg.cls)}>
                              {statusCfg.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost"
                                  className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                                  title="Mark done"
                                  onClick={() => handleMarkDone(row)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted"
                                  title="Edit"
                                  onClick={() => openEdit(row)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Main tasks table */}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {isToday ? "All clear for today!" : `No tasks for ${dayLabel}`}
                </p>
                <p className="text-xs mt-1">No KPI action items found.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-3 w-6"></th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2">Task</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2 hidden sm:table-cell">KPI Goal</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2">Priority</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2 hidden md:table-cell">Due Time</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2">Status</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {rows.map(row => {
                        const priority = derivePriority(row.goalStatus);
                        const statusCfg = AI_STATUS[row.status] ?? AI_STATUS.open;

                        return (
                          <tr key={row.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="py-3 px-3">
                              <input type="checkbox"
                                checked={row.status === "done"}
                                onChange={() => row.status === "done" ? openEdit(row) : handleMarkDone(row)}
                                className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer" />
                            </td>
                            <td className="py-3 px-2 max-w-[180px]">
                              <span className={cn("line-clamp-1 font-medium text-foreground text-xs", row.status === "done" && "line-through text-muted-foreground")}>
                                {row.title}
                              </span>
                              {row.owner && <p className="text-[10px] text-muted-foreground mt-0.5">{row.owner}</p>}
                            </td>
                            <td className="py-3 px-2 hidden sm:table-cell text-xs text-muted-foreground max-w-[120px]">
                              <span className="line-clamp-1">{row.goalName}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", getPriorityStyle(priority))}>
                                {priority}
                              </span>
                            </td>
                            <td className="py-3 px-2 hidden md:table-cell text-xs text-muted-foreground">
                              {formatDueTime(row.dueDate)}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5", statusCfg.cls)}>
                                {statusCfg.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {canEdit ? (
                                <div className="flex items-center gap-1">
                                  {row.status !== "done" && (
                                    <Button size="sm" variant="ghost"
                                      className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                      title="Mark done"
                                      onClick={() => handleMarkDone(row)}>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted"
                                    title="Edit"
                                    onClick={() => openEdit(row)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5", statusCfg.cls)}>
                                  {statusCfg.label}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end px-4 py-2 border-t border-border/30">
                  {canEdit && rows.some(r => r.status !== "done") && (
                    <Button size="sm" className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
                      onClick={async () => {
                        await Promise.all(
                          rows.filter(r => r.status !== "done").map(r =>
                            fetch(`/api/kpi/action-items/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) })
                          )
                        );
                        setRows(rs => rs.map(r => ({ ...r, status: "done" })));
                        toast.success("All marked as done");
                      }}>
                      <Check className="h-3 w-3" /> Mark All as Done
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Today's Priorities sidebar — 1/3 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-4">TODAY&apos;S PRIORITIES</p>
        <div className="space-y-3">
          {([
            { label: "OVERDUE TASKS", count: overdueRows.length, icon: <Clock className="h-4 w-4 text-red-500" />, cls: "bg-red-50 border-red-200 text-red-700", scrollTo: "kpi-overdue-tasks" },
            { label: "PENDING TODAY", count: pendingCount, icon: <Calendar className="h-4 w-4 text-orange-500" />, cls: "bg-orange-50 border-orange-200 text-orange-700", scrollTo: "kpi-today-tasks" },
            { label: "COMPLETED TODAY", count: completedCount, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", scrollTo: "kpi-today-tasks" },
            { label: "APPROVALS WAITING", count: 0, icon: <CheckSquare className="h-4 w-4 text-blue-500" />, cls: "bg-blue-50 border-blue-200 text-blue-700", scrollTo: null },
          ] as const).map(({ label, count, icon, cls, scrollTo }) => (
            <button
              key={label}
              onClick={() => {
                if (scrollTo) {
                  document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={cn("w-full flex items-center justify-between p-3 rounded-lg border transition-colors hover:opacity-80", cls, !scrollTo && "cursor-default")}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-bold tracking-wide">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold">{count}</span>
                {scrollTo && <ArrowRight className="h-3.5 w-3.5 opacity-60" />}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mb-1">This Week&apos;s KPI Goals</p>
          <p className="text-2xl font-bold">{weeklyGoals.length}</p>
          <p className="text-xs text-muted-foreground">goals available to link tasks</p>
        </div>
      </div>

      {/* Task form dialog — handles both new and edit modes */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        mode={taskDialogMode}
        selectedDay={selectedDay}
        weeklyGoals={weeklyGoals}
        loadingGoals={loadingGoals}
        departmentKey={departmentKey}
        row={taskDialogRow}
        onCreated={(newRow) => {
          setRows(rs => [newRow, ...rs]);
          loadData(selectedDay, true);
        }}
        onUpdated={(updated) => {
          setRows(rs => rs.map(r => r.id === updated.id ? updated : r));
          setOverdueRows(rs =>
            rs.map(r => r.id === updated.id ? updated : r).filter(r => r.status !== "done")
          );
          loadData(selectedDay, true);
        }}
      />
    </div>
  );
}

// ─── THIS WEEK'S PROGRESS ────────────────────────────────────────────────────

function WeekProgressSection({ canEdit, departmentKey, year, periods }: { canEdit: boolean; departmentKey: string; year: string; periods: ReturnType<typeof getCurrentPeriods> }) {
  const router = useRouter();
  const [weekGoals, setWeekGoals] = useState<GoalNodeData[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<GoalNodeData[]>([]);
  const [allActionItems, setAllActionItems] = useState<{ status: string; dueDate?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(periods.week);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, mRes] = await Promise.all([
        fetch(`/api/kpi/goals?department=${departmentKey}&level=weekly`),
        fetch(`/api/kpi/goals?department=${departmentKey}&level=monthly`),
      ]);
      const [wj, mj] = await Promise.all([wRes.json(), mRes.json()]);
      if (mRes.ok) {
        const all: GoalNodeData[] = mj.data ?? [];
        setMonthlyGoals(all.filter(g => g.periodLabel.includes(year)));
      }
      if (wRes.ok) {
        const all: GoalNodeData[] = wj.data ?? [];
        const filtered = all.filter(g => g.periodLabel.includes(year));
        setWeekGoals(filtered);

        // Fetch action items for the current week's goals
        const thisWeekGoals = filtered.filter(g => g.periodLabel === periods.week);
        if (thisWeekGoals.length > 0) {
          const results = await Promise.all(
            thisWeekGoals.slice(0, 5).map(g =>
              fetch(`/api/kpi/goals/${g.id}`)
                .then(r => r.json())
                .then(j2 => j2.data?.actionItems ?? [])
                .catch(() => [])
            )
          );
          setAllActionItems(results.flat());
        }
      }
    } finally { setLoading(false); }
  }, [departmentKey, year, periods.week]);

  useEffect(() => { load(); }, [load]);

  const periodOptions = mergeOptions(
    buildWeekOptions(year),
    weekGoals.map(g => g.periodLabel),
    weekLabel,
  );

  const visible = weekGoals.filter(g => g.periodLabel === selectedPeriod);

  // Stats derived from action items for this week
  const assigned = allActionItems.length;
  const completed = allActionItems.filter(ai => ai.status === "done").length;
  const pending = allActionItems.filter(ai => ai.status !== "done").length;
  const completionPct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  const today = new Date();
  const delayed = allActionItems.filter(ai => {
    try { return ai.dueDate && new Date(ai.dueDate) < today && ai.status !== "done"; } catch { return false; }
  }).length;
  const topPriority = visible.filter(g => displayStats(g).status === "red").length;

  // Bar chart: group action items by their actual dueDate day within the selected week
  const weekDays = (() => {
    // Parse "W2-2026-07" → week n of year/month. Week n covers days [(n-1)*7+1 .. n*7].
    const wm = selectedPeriod.match(/W(\d)-(\d{4})-(\d{2})/);
    if (!wm) return [];
    const weekNum = parseInt(wm[1]);
    const yr = parseInt(wm[2]);
    const mo = parseInt(wm[3]);
    const startDay = (weekNum - 1) * 7 + 1;
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const result: { date: string; label: string }[] = [];
    for (let d = startDay; d <= Math.min(startDay + 6, daysInMonth); d++) {
      const dateStr = `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const label = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
      result.push({ date: dateStr, label });
    }
    return result;
  })();

  const barData = weekDays.map(({ date, label }) => {
    const dayItems = allActionItems.filter(ai => {
      if (!ai.dueDate) return false;
      try { return localDateStr(new Date(ai.dueDate)) === date; } catch { return false; }
    });
    return {
      day: label,
      completed: dayItems.filter(ai => ai.status === "done").length,
      pending: dayItems.filter(ai => ai.status !== "done").length,
    };
  });

  const currentBadgeLabel = periodOptions.find(o => o.value === selectedPeriod)?.label ?? selectedPeriod;

  return (
    <SectionCard
      icon={<Activity className="h-4 w-4 text-orange-500" />}
      number={2}
      title="THIS WEEK'S PROGRESS"
      badge={<Badge variant="outline" className="text-[10px] font-mono bg-orange-50 text-orange-700 border-orange-200">{currentBadgeLabel}</Badge>}
      rightSlot={
        <div className="flex items-center gap-1.5">
          <PeriodSelector options={periodOptions} value={selectedPeriod} onChange={setSelectedPeriod} />
          {canEdit && !adding && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/kpi/${departmentKey}/weekly`)}>
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pb-3 border-b border-border/40">
            {[
              { label: "Tasks Assigned", value: assigned },
              { label: "Completed", value: completed, cls: "text-emerald-600 font-bold" },
              { label: "Pending", value: pending },
              { label: "Completion %", value: `${completionPct}%`, cls: "text-emerald-600 font-bold" },
              { label: "Delayed", value: delayed, cls: delayed > 0 ? "text-red-500 font-semibold" : "" },
              { label: "Top Priority", value: topPriority },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("font-semibold", cls)}>{value}</span>
              </div>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No weekly goals for {currentBadgeLabel}.
              {canEdit && <button type="button" className="text-xs text-primary hover:underline ml-1" onClick={() => setAdding(true)}>Add one</button>}
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground font-medium">Daily Completion</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={barData} barSize={10} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="completed" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pending" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-500 inline-block" /><span className="text-[10px] text-muted-foreground">Completed</span></div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-gray-200 inline-block" /><span className="text-[10px] text-muted-foreground">Pending</span></div>
              </div>
            </>
          )}

          {adding && (
            <AddGoalInline level="weekly" periodLabel={selectedPeriod} departmentKey={departmentKey} parentId={null}
              parentGoals={monthlyGoals.map(g => ({ id: g.id, name: g.name, periodLabel: g.periodLabel }))}
              onAdded={g => { setWeekGoals(gs => [...gs, g]); setAdding(false); setSelectedPeriod(g.periodLabel); }}
              onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── MONTHLY KPI ──────────────────────────────────────────────────────────────

function MonthlySection({ canEdit, departmentKey, year, periods }: { canEdit: boolean; departmentKey: string; year: string; periods: ReturnType<typeof getCurrentPeriods> }) {
  const router = useRouter();
  const [monthGoals, setMonthGoals] = useState<GoalNodeData[]>([]);
  const [quarterlyGoals, setQuarterlyGoals] = useState<GoalNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(periods.month);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, qRes] = await Promise.all([
        fetch(`/api/kpi/goals?department=${departmentKey}&level=monthly`),
        fetch(`/api/kpi/goals?department=${departmentKey}&level=quarterly`),
      ]);
      const [mj, qj] = await Promise.all([mRes.json(), qRes.json()]);
      if (mRes.ok) {
        const all: GoalNodeData[] = mj.data ?? [];
        setMonthGoals(all.filter(g => g.periodLabel.includes(year)));
      }
      if (qRes.ok) {
        const all: GoalNodeData[] = qj.data ?? [];
        setQuarterlyGoals(all.filter(g => g.periodLabel.includes(year)));
      }
    } finally { setLoading(false); }
  }, [departmentKey, year]);

  useEffect(() => { load(); }, [load]);

  // Always show all 12 months + any extras from DB
  const periodOptions = mergeOptions(
    buildMonthOptions(year),
    monthGoals.map(g => g.periodLabel),
    monthLabel,
  );

  const visible = monthGoals.filter(g => g.periodLabel === selectedPeriod);
  const currentBadgeLabel = periodOptions.find(o => o.value === selectedPeriod)?.label ?? monthLabel(selectedPeriod);

  return (
    <SectionCard
      icon={<Calendar className="h-4 w-4 text-cyan-600" />}
      number={3}
      title="MONTHLY KPI"
      badge={
        <Badge variant="outline" className="text-[10px] font-mono bg-cyan-50 text-cyan-700 border-cyan-200">
          {currentBadgeLabel}
        </Badge>
      }
      rightSlot={
        <div className="flex items-center gap-1.5">
          <PeriodSelector options={periodOptions} value={selectedPeriod} onChange={setSelectedPeriod} />
          {canEdit && !adding && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" title="Add monthly goal" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/kpi/${departmentKey}/monthly`)}>
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No monthly KPIs for {currentBadgeLabel}</p>
              {canEdit && (
                <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => setAdding(true)}>
                  Add a goal for this month
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Summary strip */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {visible.length} Goal{visible.length !== 1 ? "s" : ""}
                </p>
                <GoalStatusSummary goals={visible} />
              </div>
              {/* Compact rows */}
              <div className="divide-y divide-border/30">
                {visible.map(g => (
                  <CompactGoalRow key={g.id} goal={g} level="monthly" canEdit={canEdit}
                    parentGoals={quarterlyGoals.map(q => ({ id: q.id, name: q.name, periodLabel: q.periodLabel }))}
                    onUpdated={u => setMonthGoals(ms => ms.map(x => x.id === u.id ? { ...x, ...u } : x))}
                    onDeleted={id => setMonthGoals(ms => ms.filter(x => x.id !== id))} />
                ))}
              </div>
            </div>
          )}

          {adding && (
            <AddGoalInline level="monthly" periodLabel={selectedPeriod} departmentKey={departmentKey} parentId={null}
              parentGoals={quarterlyGoals.map(g => ({ id: g.id, name: g.name, periodLabel: g.periodLabel }))}
              onAdded={g => { setMonthGoals(ms => [...ms, g]); setAdding(false); setSelectedPeriod(g.periodLabel); }}
              onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── QUARTERLY KPI ────────────────────────────────────────────────────────────

function QuarterlySection({ canEdit, departmentKey, year, periods, yearlyGoals }: { canEdit: boolean; departmentKey: string; year: string; periods: ReturnType<typeof getCurrentPeriods>; yearlyGoals?: GoalNodeData[] }) {
  const router = useRouter();
  const [quarterGoals, setQuarterGoals] = useState<GoalNodeData[]>([]);
  const [monthGoals, setMonthGoals] = useState<GoalNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(periods.quarter);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, mRes] = await Promise.all([
        fetch(`/api/kpi/goals?department=${departmentKey}&level=quarterly`),
        fetch(`/api/kpi/goals?department=${departmentKey}&level=monthly`),
      ]);
      const [qj, mj] = await Promise.all([qRes.json(), mRes.json()]);
      if (qRes.ok) { const all: GoalNodeData[] = qj.data ?? []; setQuarterGoals(all.filter(g => g.periodLabel.includes(year))); }
      if (mRes.ok) { const all: GoalNodeData[] = mj.data ?? []; setMonthGoals(all.filter(g => g.periodLabel.includes(year))); }
    } finally { setLoading(false); }
  }, [departmentKey, year]);

  useEffect(() => { load(); }, [load]);

  // Always show all 4 quarters + any extras from DB
  const periodOptions = mergeOptions(
    buildQuarterOptions(year),
    quarterGoals.map(g => g.periodLabel),
    v => v,
  );

  const visibleQ = quarterGoals.filter(g => g.periodLabel === selectedPeriod);

  // Monthly breakdown for the selected quarter
  const qMonths = ((): { label: string; period: string; pct: number | null; sk: string }[] => {
    const m = selectedPeriod.match(/Q(\d)-(\d{4})/);
    if (!m) return [];
    const q = parseInt(m[1]);
    const yr = m[2];
    const startMonth = (q - 1) * 3 + 1;
    return [0, 1, 2].map(offset => {
      const mo = startMonth + offset;
      const periodLabel = `${yr}-${String(mo).padStart(2, "0")}`;
      const monthGoalsForPeriod = monthGoals.filter(g => g.periodLabel === periodLabel);
      const vals = monthGoalsForPeriod.map(g => displayStats(g).pct).filter((p): p is number => p !== null);
      const avgPct = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const sk = avgPct !== null ? (avgPct >= 100 ? "green" : avgPct >= 80 ? "yellow" : "red") : "none";
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return { label: months[mo - 1], period: periodLabel, pct: avgPct, sk };
    });
  })();

  const qAvgPct = (() => {
    const vals = visibleQ.map(g => displayStats(g).pct).filter((p): p is number => p !== null);
    if (vals.length === 0) {
      const monthVals = qMonths.map(m => m.pct).filter((p): p is number => p !== null);
      if (monthVals.length === 0) return null;
      return monthVals.reduce((a, b) => a + b, 0) / monthVals.length;
    }
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  const qSk = qAvgPct !== null ? (qAvgPct >= 100 ? "green" : qAvgPct >= 80 ? "yellow" : "red") : "none";

  return (
    <SectionCard
      icon={<BarChart2 className="h-4 w-4 text-blue-600" />}
      number={4}
      title="QUARTERLY KPI"
      badge={
        <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 text-blue-700 border-blue-200">
          {selectedPeriod}
        </Badge>
      }
      rightSlot={
        <div className="flex items-center gap-1.5">
          <PeriodSelector options={periodOptions} value={selectedPeriod} onChange={setSelectedPeriod} />
          {canEdit && !adding && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" title="Add quarterly goal" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/kpi/${departmentKey}/quarterly`)}>
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Monthly breakdown + chart */}
          <div className="space-y-1">
            {qMonths.map(m => (
              <MonthProgressRow key={m.period} label={m.label} pct={m.pct} sk={m.sk} />
            ))}

            {/* Mini line chart */}
            {qMonths.some(m => m.pct !== null) && (
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={qMonths.filter(m => m.pct !== null)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[50, 110]} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 6 }}
                      formatter={(v) => [`${v}%`, "Progress"]}
                    />
                    <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="border-t border-border/40 pt-3 mt-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Q Achievement</p>
                <p className={cn("text-4xl font-bold tabular-nums mt-0.5", statusColor(qSk))}>
                  {qAvgPct !== null ? `${Math.round(qAvgPct)}%` : "—"}
                </p>
              </div>
              {qAvgPct !== null && (
                <div className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border", (STATUS_META[qSk] ?? STATUS_META.none).lightBg, (STATUS_META[qSk] ?? STATUS_META.none).border, (STATUS_META[qSk] ?? STATUS_META.none).text)}>
                  {(STATUS_META[qSk] ?? STATUS_META.none).label}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quarterly goals — compact list */}
          <div>
            {visibleQ.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center h-full">
                <p className="text-sm">No quarterly goals for {selectedPeriod}</p>
                {canEdit && (
                  <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => setAdding(true)}>
                    Add a goal for this quarter
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Summary strip */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {visibleQ.length} Goal{visibleQ.length !== 1 ? "s" : ""}
                  </p>
                  <GoalStatusSummary goals={visibleQ} />
                </div>
                {/* Compact rows */}
                <div className="divide-y divide-border/30">
                  {visibleQ.map(g => (
                    <CompactGoalRow key={g.id} goal={g} level="quarterly" canEdit={canEdit}
                      parentGoals={yearlyGoals?.map(y => ({ id: y.id, name: y.name, periodLabel: y.periodLabel }))}
                      onUpdated={u => setQuarterGoals(qs => qs.map(x => x.id === u.id ? { ...x, ...u } : x))}
                      onDeleted={id => setQuarterGoals(qs => qs.filter(x => x.id !== id))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {adding && (
        <div className="mt-3">
          <AddGoalInline level="quarterly" periodLabel={selectedPeriod} departmentKey={departmentKey} parentId={null}
            parentGoals={yearlyGoals?.map(g => ({ id: g.id, name: g.name, periodLabel: g.periodLabel }))}
            onAdded={g => { setQuarterGoals(qs => [...qs, g]); setAdding(false); setSelectedPeriod(g.periodLabel); }}
            onCancel={() => setAdding(false)} />
        </div>
      )}
    </SectionCard>
  );
}

// ─── YEARLY KPI ───────────────────────────────────────────────────────────────

function YearlySection({ goals, loading, canEdit, departmentKey, year, onGoalsChange, onStatsChange }: {
  goals: GoalNodeData[]; loading: boolean; canEdit: boolean;
  departmentKey: string; year: string;
  onGoalsChange: (gs: GoalNodeData[]) => void;
  onStatsChange?: (s: { total: number; green: number; yellow: number; red: number }) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    onStatsChange?.({
      total: goals.length,
      green:  goals.filter(g => displayStats(g).status === "green").length,
      yellow: goals.filter(g => displayStats(g).status === "yellow").length,
      red:    goals.filter(g => displayStats(g).status === "red").length,
    });
  }, [goals]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SectionCard
      icon={<Target className="h-4 w-4 text-violet-600" />}
      number={5}
      title="YEARLY KPI"
      badge={
        <Badge variant="outline" className="text-[10px] font-mono bg-violet-50 text-violet-700 border-violet-200">
          {year}
        </Badge>
      }
      rightSlot={
        <div className="flex items-center gap-1.5">
          {canEdit && !adding && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add KPI Goal
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/kpi/${departmentKey}/yearly`)}>
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
              <span className="text-4xl mb-3">📊</span>
              <p className="font-medium text-foreground text-sm">No yearly KPI goals for {year}</p>
              {canEdit && (
                <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => setAdding(true)}>
                  Add a KPI goal
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {goals.map(g => (
                <MetricCard key={g.id} goal={g} level="yearly" canEdit={canEdit}
                  onUpdated={u => onGoalsChange(goals.map(x => x.id === u.id ? { ...x, ...u } : x))}
                  onDeleted={id => onGoalsChange(goals.filter(x => x.id !== id))} />
              ))}
            </div>
          )}

          {adding && (
            <AddGoalInline level="yearly" periodLabel={year} departmentKey={departmentKey} parentId={null}
              onAdded={g => { onGoalsChange([...goals, g]); setAdding(false); }}
              onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function KpiSplitView({ departmentKey, year, canEdit, onStatsChange }: KpiSplitViewProps) {
  const router = useRouter();
  const [yearlyGoals, setYearlyGoals] = useState<GoalNodeData[]>([]);
  const [allGoals, setAllGoals] = useState<GoalNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const periods = getCurrentPeriods(year);

  const fetchYearly = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kpi/goals?department=${departmentKey}&year=${year}`);
      const j = await res.json();
      if (res.ok) {
        const data: GoalNodeData[] = j.data ?? [];
        setYearlyGoals(data);
        setAllGoals(data);
      }
    } catch { toast.error("Failed to load KPI goals"); }
    finally { setLoading(false); }
  }, [departmentKey, year]);

  useEffect(() => { fetchYearly(); }, [fetchYearly]);

  return (
    <div className="space-y-4">
      {/* 1. TODAY'S TASKS + TODAY'S PRIORITIES */}
      <TodaysTasksSection goals={allGoals} canEdit={canEdit} departmentKey={departmentKey} year={year} />

      {/* 2 + 3 + 4. WEEK PROGRESS + MONTHLY + QUARTERLY — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WeekProgressSection canEdit={canEdit} departmentKey={departmentKey} year={year} periods={periods} />
        <MonthlySection canEdit={canEdit} departmentKey={departmentKey} year={year} periods={periods} />
        <QuarterlySection canEdit={canEdit} departmentKey={departmentKey} year={year} periods={periods} yearlyGoals={yearlyGoals} />
      </div>

      {/* 5. YEARLY */}
      <YearlySection
        goals={yearlyGoals}
        loading={loading}
        canEdit={canEdit}
        departmentKey={departmentKey}
        year={year}
        onGoalsChange={setYearlyGoals}
        onStatsChange={onStatsChange}
      />

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-4">QUICK ACTIONS</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Add Task", icon: <Plus className="h-5 w-5" />, color: "text-blue-600 bg-blue-50 hover:bg-blue-100", route: "/tasks" },
            { label: "Add Goal", icon: <Target className="h-5 w-5" />, color: "text-purple-600 bg-purple-50 hover:bg-purple-100", route: `/kpi/${departmentKey}` },
            { label: "View Reports", icon: <FileText className="h-5 w-5" />, color: "text-orange-600 bg-orange-50 hover:bg-orange-100", route: "/reports/daily" },
            { label: "Approvals", icon: <CheckSquare className="h-5 w-5" />, color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100", route: "/tasks" },
            { label: "Alerts", icon: <Bell className="h-5 w-5" />, color: "text-red-600 bg-red-50 hover:bg-red-100", route: "/dashboard" },
            { label: "Calendar", icon: <Calendar className="h-5 w-5" />, color: "text-cyan-600 bg-cyan-50 hover:bg-cyan-100", route: "/meetings" },
          ].map(({ label, icon, color, route }) => (
            <button key={label} onClick={() => router.push(route)}
              className={cn("flex flex-col items-center gap-2 p-3 rounded-xl transition-colors", color)}>
              {icon}
              <span className="text-xs font-medium text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
