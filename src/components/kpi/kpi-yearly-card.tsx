"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiStatusBadge, type KpiStatus } from "./kpi-status-badge";
import { KpiActionItemList } from "./kpi-action-item-list";
import type { KpiGoalData, KpiLevel } from "./kpi-goal-form";
import type { KpiActionItemData } from "./kpi-action-item-form";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

export interface GoalNodeData extends KpiGoalData {
  _count?: { children: number; actionItems: number };
  actionItems?: KpiActionItemData[];
  children?: GoalNodeData[];
}

interface FlatRow {
  goal: GoalNodeData;
  level: "quarterly" | "monthly" | "daily";
  depth: number; // 0=quarterly, 1=monthly, 2=daily
}

interface EditValues {
  name: string;
  periodLabel: string;
  unit: string;
  target: string;
  actual: string;
  status: string;
  higherIsBetter: boolean;
  notes: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const LEVEL_BADGE: Record<string, string> = {
  quarterly: "bg-blue-100 text-blue-700 border-blue-200",
  monthly: "bg-cyan-100 text-cyan-700 border-cyan-200",
  daily: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const CHILD_OF: Record<string, KpiLevel | null> = {
  quarterly: "monthly",
  monthly: "daily",
  daily: null,
};

const CHILD_LABEL: Record<string, string> = {
  quarterly: "Month",
  monthly: "Day",
  daily: "",
};

const PERIOD_HINT: Record<string, string> = {
  quarterly: "Q1-2026",
  monthly: "2026-06",
  daily: "2026-06-20",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function flattenChildren(goal: GoalNodeData): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const q of goal.children ?? []) {
    rows.push({ goal: q, level: "quarterly", depth: 0 });
    for (const m of q.children ?? []) {
      rows.push({ goal: m, level: "monthly", depth: 1 });
      for (const d of m.children ?? []) {
        rows.push({ goal: d, level: "daily", depth: 2 });
      }
    }
  }
  return rows;
}

function goalToEdit(g: GoalNodeData): EditValues {
  return {
    name: g.name,
    periodLabel: g.periodLabel,
    unit: g.unit ?? "",
    target: g.target ?? "",
    actual: g.actual ?? "",
    status: g.status ?? "none",
    higherIsBetter: g.higherIsBetter,
    notes: g.notes ?? "",
  };
}

function blankEditValues(level: string): EditValues {
  return {
    name: "",
    periodLabel: "",
    unit: "",
    target: "",
    actual: "",
    status: "none",
    higherIsBetter: true,
    notes: "",
  };
}

// ─── inline edit form ─────────────────────────────────────────────────────────

function EditForm({
  values,
  onChange,
  onSave,
  onCancel,
  isSaving,
  level,
  isNew,
}: {
  values: EditValues;
  onChange: (v: EditValues) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  level: string;
  isNew?: boolean;
}) {
  const set =
    (k: keyof EditValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [k]: e.target.value });

  return (
    <div className="border-t border-dashed border-border/60 bg-muted/30 px-4 py-3 space-y-3">
      {isNew && (
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">
          + New {level.charAt(0).toUpperCase() + level.slice(1)} Goal
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="sm:col-span-2">
          <label className="field-label">Name *</label>
          <Input
            value={values.name}
            onChange={set("name")}
            placeholder="Goal name"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Period</label>
          <Input
            value={values.periodLabel}
            onChange={set("periodLabel")}
            placeholder={PERIOD_HINT[level] ?? ""}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="field-label">Unit</label>
          <Input
            value={values.unit}
            onChange={set("unit")}
            placeholder="%, Cr…"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div>
          <label className="field-label">Target</label>
          <Input value={values.target} onChange={set("target")} placeholder="e.g. 2.5 Cr" className="h-8 text-sm" />
        </div>
        <div>
          <label className="field-label">Actual</label>
          <Input value={values.actual} onChange={set("actual")} placeholder="e.g. 2.1 Cr" className="h-8 text-sm" />
        </div>
        <div>
          <label className="field-label">Status</label>
          <Select value={values.status || "none"} onValueChange={(v) => onChange({ ...values, status: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              <SelectItem value="green">🟢 On Track</SelectItem>
              <SelectItem value="yellow">🟡 At Risk</SelectItem>
              <SelectItem value="red">🔴 Off Track</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="field-label">Direction</label>
          <Select
            value={values.higherIsBetter ? "higher" : "lower"}
            onValueChange={(v) => onChange({ ...values, higherIsBetter: v === "higher" })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="higher">↑ Higher better</SelectItem>
              <SelectItem value="lower">↓ Lower better</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {!isNew && (
        <div>
          <label className="field-label">Notes</label>
          <Textarea value={values.notes} onChange={(e) => onChange({ ...values, notes: e.target.value })} rows={2} className="text-sm resize-none" placeholder="Optional notes…" />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving} className="h-8 gap-1">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-1">
          <Check className="h-3.5 w-3.5" />
          {isSaving ? "Saving…" : isNew ? "Create" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── sub-goal table row ───────────────────────────────────────────────────────

function SubGoalRow({
  row,
  departmentKey,
  canEdit,
  onSaved,
  onDeleted,
  onChildAdded,
}: {
  row: FlatRow;
  departmentKey: string;
  canEdit: boolean;
  onSaved: (updated: GoalNodeData) => void;
  onDeleted: (id: number) => void;
  onChildAdded: (parent: GoalNodeData, child: GoalNodeData) => void;
}) {
  const { goal, level, depth } = row;
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [editValues, setEditValues] = useState<EditValues>(goalToEdit(goal));
  const [isSaving, setIsSaving] = useState(false);
  const [addValues, setAddValues] = useState<EditValues>(blankEditValues(CHILD_OF[level] ?? ""));
  const [isAddSaving, setIsAddSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const childLevel = CHILD_OF[level];

  const handleSave = async () => {
    if (!editValues.name.trim()) { toast.error("Name is required"); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editValues.name.trim(),
          periodLabel: editValues.periodLabel.trim(),
          unit: editValues.unit || null,
          target: editValues.target || null,
          actual: editValues.actual || null,
          status: editValues.status && editValues.status !== "none" ? editValues.status : null,
          higherIsBetter: editValues.higherIsBetter,
          notes: editValues.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success("Saved");
      onSaved(json.data);
      setMode("view");
    } catch { toast.error("Unexpected error"); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || "Failed"); return; }
      toast.success("Deleted");
      onDeleted(goal.id);
    } catch { toast.error("Unexpected error"); }
    finally { setIsDeleting(false); setDeleteOpen(false); }
  };

  const handleAddChild = async () => {
    if (!childLevel) return;
    if (!addValues.name.trim()) { toast.error("Name is required"); return; }
    if (!addValues.periodLabel.trim()) { toast.error("Period is required"); return; }
    setIsAddSaving(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey,
          level: childLevel,
          parentId: goal.id,
          name: addValues.name.trim(),
          periodLabel: addValues.periodLabel.trim(),
          unit: addValues.unit || null,
          target: addValues.target || null,
          higherIsBetter: addValues.higherIsBetter,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success(`${CHILD_LABEL[level]} goal added`);
      onChildAdded(goal, json.data);
      setMode("view");
    } catch { toast.error("Unexpected error"); }
    finally { setIsAddSaving(false); }
  };

  const indentClass = depth === 0 ? "pl-4" : depth === 1 ? "pl-10" : "pl-16";

  return (
    <>
      {/* ── View row ──────────────────────────────────────────────── */}
      <div className={cn("group flex items-center gap-3 py-2.5 pr-3 hover:bg-muted/30 transition-colors border-t border-border/30", indentClass)}>
        {/* Level badge + name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium shrink-0", LEVEL_BADGE[level])}>
            {goal.periodLabel}
          </Badge>
          <span className="text-sm font-medium truncate text-foreground">{goal.name}</span>
        </div>

        {/* Metrics */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="w-20 text-right">
            {goal.target ? <>{goal.target}{goal.unit ? ` ${goal.unit}` : ""}</> : <span className="opacity-40 italic">—</span>}
          </span>
          <span className="w-20 text-right">
            {goal.actual
              ? <strong className="text-foreground">{goal.actual}{goal.unit ? ` ${goal.unit}` : ""}</strong>
              : <span className="opacity-40 italic">—</span>}
          </span>
          <KpiStatusBadge status={goal.status as KpiStatus} size="sm" showLabel={false} />
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            {childLevel && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs px-2 text-muted-foreground hidden sm:flex"
                onClick={() => { setAddValues(blankEditValues(childLevel)); setMode("add"); }}>
                <Plus className="h-3 w-3" />{CHILD_LABEL[level]}
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => { setEditValues(goalToEdit(goal)); setMode("edit"); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Edit panel ──────────────────────────────────────────────── */}
      {mode === "edit" && (
        <div className={cn("px-4", indentClass)}>
          <EditForm
            values={editValues}
            onChange={setEditValues}
            onSave={handleSave}
            onCancel={() => setMode("view")}
            isSaving={isSaving}
            level={level}
          />
        </div>
      )}

      {/* ── Add child panel ─────────────────────────────────────────── */}
      {mode === "add" && childLevel && (
        <div className={cn("px-4", indentClass)}>
          <EditForm
            values={addValues}
            onChange={setAddValues}
            onSave={handleAddChild}
            onCancel={() => setMode("view")}
            isSaving={isAddSaving}
            level={childLevel}
            isNew
          />
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{goal.name}&quot;? All sub-goals and action items will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── main card component ──────────────────────────────────────────────────────

interface KpiYearlyCardProps {
  goal: GoalNodeData;
  departmentKey: string;
  canEdit: boolean;
  onUpdated: (goal: GoalNodeData) => void;
  onDeleted: (id: number) => void;
}

export function KpiYearlyCard({ goal: initialGoal, departmentKey, canEdit, onUpdated, onDeleted }: KpiYearlyCardProps) {
  const [goal, setGoal] = useState<GoalNodeData>(initialGoal);
  const [expanded, setExpanded] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(Boolean(initialGoal.children));
  const [rows, setRows] = useState<FlatRow[]>(flattenChildren(initialGoal));

  // Edit state for the yearly header
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerEdit, setHeaderEdit] = useState<EditValues>(goalToEdit(initialGoal));
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [addYearlyChildOpen, setAddYearlyChildOpen] = useState(false);
  const [addYearlyChildValues, setAddYearlyChildValues] = useState<EditValues>(blankEditValues("quarterly"));
  const [isSavingYearlyChild, setIsSavingYearlyChild] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // Load full tree on first expand
  const loadFull = useCallback(async () => {
    if (fullLoaded) return;
    setIsLoadingFull(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}?full=true`);
      const json = await res.json();
      if (res.ok) {
        const loaded = json.data as GoalNodeData;
        setGoal((prev) => ({ ...prev, ...loaded }));
        setRows(flattenChildren(loaded));
        setFullLoaded(true);
      }
    } catch { toast.error("Failed to load sub-goals"); }
    finally { setIsLoadingFull(false); }
  }, [fullLoaded, goal.id]);

  const handleToggle = () => {
    if (!expanded) loadFull();
    setExpanded((e) => !e);
  };

  // Rebuild rows from goal's children
  const rebuildRows = useCallback((updatedGoal: GoalNodeData) => {
    setGoal(updatedGoal);
    setRows(flattenChildren(updatedGoal));
  }, []);

  // Update a specific node in the tree
  const updateNodeInTree = useCallback((updated: GoalNodeData) => {
    setGoal((prev) => {
      const clone = structuredClone(prev) as GoalNodeData;
      function patchNode(node: GoalNodeData): boolean {
        if (node.id === updated.id) { Object.assign(node, updated); return true; }
        for (const c of node.children ?? []) { if (patchNode(c)) return true; }
        return false;
      }
      patchNode(clone);
      setRows(flattenChildren(clone));
      return clone;
    });
  }, []);

  // Delete a node from the tree
  const deleteNodeFromTree = useCallback((id: number) => {
    setGoal((prev) => {
      const clone = structuredClone(prev) as GoalNodeData;
      function removeNode(parent: GoalNodeData): boolean {
        const idx = parent.children?.findIndex((c) => c.id === id) ?? -1;
        if (idx >= 0) { parent.children!.splice(idx, 1); return true; }
        for (const c of parent.children ?? []) { if (removeNode(c)) return true; }
        return false;
      }
      removeNode(clone);
      setRows(flattenChildren(clone));
      return clone;
    });
  }, []);

  // Add a child node to a parent
  const addChildToTree = useCallback((parentGoal: GoalNodeData, child: GoalNodeData) => {
    setGoal((prev) => {
      const clone = structuredClone(prev) as GoalNodeData;
      function addToParent(node: GoalNodeData): boolean {
        if (node.id === parentGoal.id) {
          node.children = [...(node.children ?? []), child];
          return true;
        }
        for (const c of node.children ?? []) { if (addToParent(c)) return true; }
        return false;
      }
      addToParent(clone);
      setRows(flattenChildren(clone));
      return clone;
    });
    setOpenPanel(null);
  }, []);

  // Save yearly header edit
  const handleSaveHeader = async () => {
    if (!headerEdit.name.trim()) { toast.error("Name is required"); return; }
    setIsSavingHeader(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: headerEdit.name.trim(),
          periodLabel: headerEdit.periodLabel.trim(),
          unit: headerEdit.unit || null,
          target: headerEdit.target || null,
          actual: headerEdit.actual || null,
          status: headerEdit.status && headerEdit.status !== "none" ? headerEdit.status : null,
          higherIsBetter: headerEdit.higherIsBetter,
          notes: headerEdit.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      setGoal((prev) => ({ ...prev, ...json.data }));
      onUpdated(json.data);
      toast.success("Goal updated");
      setIsEditingHeader(false);
    } catch { toast.error("Unexpected error"); }
    finally { setIsSavingHeader(false); }
  };

  // Delete the yearly goal
  const handleDeleteYearly = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || "Failed"); return; }
      toast.success("Goal deleted");
      onDeleted(goal.id);
    } catch { toast.error("Unexpected error"); }
    finally { setIsDeleting(false); setDeleteOpen(false); }
  };

  // Add quarterly child to yearly goal
  const handleAddQuarterly = async () => {
    if (!addYearlyChildValues.name.trim()) { toast.error("Name is required"); return; }
    if (!addYearlyChildValues.periodLabel.trim()) { toast.error("Period is required"); return; }
    setIsSavingYearlyChild(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey,
          level: "quarterly",
          parentId: goal.id,
          name: addYearlyChildValues.name.trim(),
          periodLabel: addYearlyChildValues.periodLabel.trim(),
          unit: addYearlyChildValues.unit || null,
          target: addYearlyChildValues.target || null,
          higherIsBetter: addYearlyChildValues.higherIsBetter,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      const child = json.data as GoalNodeData;
      setGoal((prev) => {
        const updated = { ...prev, children: [...(prev.children ?? []), child] };
        setRows(flattenChildren(updated));
        return updated;
      });
      toast.success("Quarterly goal added");
      setAddYearlyChildOpen(false);
      if (!expanded) setExpanded(true);
    } catch { toast.error("Unexpected error"); }
    finally { setIsSavingYearlyChild(false); }
  };

  const hasSub = rows.length > 0 || (goal._count?.children ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Yearly Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-violet-50/60 border-b border-violet-100">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={handleToggle}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {hasSub ? (
            expanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-violet-300 block mx-auto" />
          )}
        </button>

        {/* Year badge */}
        <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200 text-[11px] px-2 py-0.5 font-semibold shrink-0">
          {goal.periodLabel}
        </Badge>

        {/* Name */}
        <span className="flex-1 min-w-0 font-semibold text-base text-foreground truncate">
          {goal.name}
        </span>

        {/* Metrics */}
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          {goal.target && (
            <span>Target: <strong className="text-foreground">{goal.target}{goal.unit ? ` ${goal.unit}` : ""}</strong></span>
          )}
          {goal.actual ? (
            <span>Actual: <strong className="text-foreground">{goal.actual}{goal.unit ? ` ${goal.unit}` : ""}</strong></span>
          ) : (
            <span className="opacity-40 italic">Actual: —</span>
          )}
          <KpiStatusBadge status={goal.status as KpiStatus} size="sm" />
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs px-2 hidden sm:flex" onClick={() => { setAddYearlyChildValues(blankEditValues("quarterly")); setAddYearlyChildOpen(true); if (!expanded) setExpanded(true); }}>
              <Plus className="h-3.5 w-3.5" />
              Quarter
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setHeaderEdit(goalToEdit(goal)); setIsEditingHeader(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Header edit form ─────────────────────────────────────── */}
      {isEditingHeader && (
        <div className="bg-violet-50/40 border-b border-violet-100 px-4 py-3">
          <EditForm
            values={headerEdit}
            onChange={setHeaderEdit}
            onSave={handleSaveHeader}
            onCancel={() => setIsEditingHeader(false)}
            isSaving={isSavingHeader}
            level="yearly"
          />
        </div>
      )}

      {/* ── Add quarterly form ───────────────────────────────────── */}
      {addYearlyChildOpen && (
        <div className="border-b border-dashed border-border/60 px-4 py-3">
          <EditForm
            values={addYearlyChildValues}
            onChange={setAddYearlyChildValues}
            onSave={handleAddQuarterly}
            onCancel={() => setAddYearlyChildOpen(false)}
            isSaving={isSavingYearlyChild}
            level="quarterly"
            isNew
          />
        </div>
      )}

      {/* ── Sub-goals section ────────────────────────────────────── */}
      {expanded && (
        <div>
          {isLoadingFull ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No sub-goals yet.{" "}
              {canEdit && (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => { setAddYearlyChildValues(blankEditValues("quarterly")); setAddYearlyChildOpen(true); }}
                >
                  Add a quarterly goal
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Column header */}
              <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border/30 bg-muted/20">
                <span className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sub-goal</span>
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                  <span className="w-20 text-right">Target</span>
                  <span className="w-20 text-right">Actual</span>
                  <span className="w-14">Status</span>
                </div>
              </div>

              {rows.map((row) => (
                <SubGoalRow
                  key={row.goal.id}
                  row={row}
                  departmentKey={departmentKey}
                  canEdit={canEdit}
                  onSaved={(updated) => updateNodeInTree(updated)}
                  onDeleted={(id) => deleteNodeFromTree(id)}
                  onChildAdded={(parent, child) => addChildToTree(parent, child)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Action items ─────────────────────────────────────────── */}
      <div className="border-t border-border/30 bg-muted/10 px-4 py-3">
        <KpiActionItemList
          goalId={goal.id}
          initialItems={goal.actionItems ?? []}
          canEdit={canEdit}
          defaultCollapsed={false}
        />
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Yearly Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{goal.name}&quot; and all its quarterly, monthly, and daily sub-goals? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteYearly} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
