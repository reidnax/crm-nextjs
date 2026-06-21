"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X } from "lucide-react";
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

// ─── constants ────────────────────────────────────────────────────────────────

const CHILD_LEVEL: Record<KpiLevel, KpiLevel | null> = {
  yearly: "quarterly",
  quarterly: "monthly",
  monthly: "daily",
  daily: null,
};

const CHILD_LABEL: Record<KpiLevel, string> = {
  yearly: "Quarterly",
  quarterly: "Monthly",
  monthly: "Daily",
  daily: "",
};

const LEVEL_BADGE: Record<KpiLevel, string> = {
  yearly: "bg-violet-100 text-violet-700 border-violet-200",
  quarterly: "bg-blue-100 text-blue-700 border-blue-200",
  monthly: "bg-cyan-100 text-cyan-700 border-cyan-200",
  daily: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const LEVEL_ROW_BG: Record<KpiLevel, string> = {
  yearly: "bg-muted/30 border border-border/60",
  quarterly: "bg-background border border-border/40",
  monthly: "bg-muted/10 border border-border/30",
  daily: "bg-background border border-border/20",
};

const LEVEL_INDENT: Record<KpiLevel, string> = {
  yearly: "",
  quarterly: "ml-5",
  monthly: "ml-10",
  daily: "ml-15",
};

const PERIOD_PLACEHOLDER: Record<KpiLevel, string> = {
  yearly: "e.g. 2026",
  quarterly: "e.g. Q1-2026",
  monthly: "e.g. 2026-06",
  daily: "e.g. 2026-06-20",
};

// ─── types ────────────────────────────────────────────────────────────────────

export interface GoalNodeData extends KpiGoalData {
  _count?: { children: number; actionItems: number };
  actionItems?: KpiActionItemData[];
  children?: GoalNodeData[];
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

interface AddChildValues {
  name: string;
  periodLabel: string;
  unit: string;
  target: string;
}

// ─── inline input helper ──────────────────────────────────────────────────────

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface KpiGoalNodeProps {
  goal: GoalNodeData;
  departmentKey: string;
  canEdit: boolean;
  depth?: number;
  onUpdated: (goal: GoalNodeData) => void;
  onDeleted: (id: number) => void;
  onChildCreated: (parentId: number, child: GoalNodeData) => void;
}

export function KpiGoalNode({
  goal,
  departmentKey,
  canEdit,
  depth = 0,
  onUpdated,
  onDeleted,
  onChildCreated,
}: KpiGoalNodeProps) {
  // ── expand/collapse ──────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(depth < 1);
  const [children, setChildren] = useState<GoalNodeData[]>(goal.children ?? []);
  const [childrenLoaded, setChildrenLoaded] = useState(Boolean(goal.children));
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // ── ui state ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSaving, setIsAddingSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── edit form state ───────────────────────────────────────────────────────
  const [editValues, setEditValues] = useState<EditValues>({
    name: goal.name,
    periodLabel: goal.periodLabel,
    unit: goal.unit ?? "",
    target: goal.target ?? "",
    actual: goal.actual ?? "",
    status: goal.status ?? "none",
    higherIsBetter: goal.higherIsBetter,
    notes: goal.notes ?? "",
  });

  // ── add child form state ──────────────────────────────────────────────────
  const childLevel = CHILD_LEVEL[goal.level];
  const [addValues, setAddValues] = useState<AddChildValues>({
    name: "",
    periodLabel: "",
    unit: "",
    target: "",
  });

  const totalChildren = childrenLoaded
    ? children.length
    : (goal._count?.children ?? 0);

  // ── handlers ─────────────────────────────────────────────────────────────
  const loadChildren = useCallback(async () => {
    if (childrenLoaded) return;
    setIsLoadingChildren(true);
    try {
      const res = await fetch(
        `/api/kpi/goals?department=${departmentKey}&parentId=${goal.id}`
      );
      const json = await res.json();
      if (res.ok) {
        setChildren(json.data ?? []);
        setChildrenLoaded(true);
      }
    } catch {
      toast.error("Failed to load sub-goals");
    } finally {
      setIsLoadingChildren(false);
    }
  }, [childrenLoaded, departmentKey, goal.id]);

  const handleToggle = () => {
    if (!expanded && !childrenLoaded && totalChildren > 0) loadChildren();
    setExpanded((e) => !e);
  };

  const openEdit = () => {
    setEditValues({
      name: goal.name,
      periodLabel: goal.periodLabel,
      unit: goal.unit ?? "",
      target: goal.target ?? "",
      actual: goal.actual ?? "",
      status: goal.status ?? "none",
      higherIsBetter: goal.higherIsBetter,
      notes: goal.notes ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editValues.name.trim()) {
      toast.error("Goal name is required");
      return;
    }
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
          status:
            editValues.status && editValues.status !== "none"
              ? editValues.status
              : null,
          higherIsBetter: editValues.higherIsBetter,
          notes: editValues.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save");
        return;
      }
      toast.success("Goal updated");
      onUpdated(json.data as GoalNodeData);
      setIsEditing(false);
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Failed to delete");
        return;
      }
      toast.success("Goal deleted");
      onDeleted(goal.id);
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const openAddChild = () => {
    setAddValues({ name: "", periodLabel: "", unit: "", target: "" });
    setIsAddingChild(true);
    if (!expanded) {
      if (!childrenLoaded && totalChildren > 0) loadChildren();
      setExpanded(true);
    }
  };

  const handleAddChild = async () => {
    if (!childLevel) return;
    if (!addValues.name.trim()) {
      toast.error("Goal name is required");
      return;
    }
    if (!addValues.periodLabel.trim()) {
      toast.error("Period is required");
      return;
    }
    setIsAddingSaving(true);
    try {
      const res = await fetch("/api/kpi/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey,
          parentId: goal.id,
          level: childLevel,
          name: addValues.name.trim(),
          periodLabel: addValues.periodLabel.trim(),
          unit: addValues.unit || null,
          target: addValues.target || null,
          higherIsBetter: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to create");
        return;
      }
      const created = json.data as GoalNodeData;
      setChildren((prev) => [...prev, created]);
      setChildrenLoaded(true);
      onChildCreated(goal.id, created);
      toast.success(`${CHILD_LABEL[goal.level]} goal added`);
      setIsAddingChild(false);
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsAddingSaving(false);
    }
  };

  const handleChildUpdated = useCallback((updated: GoalNodeData) => {
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }, []);

  const handleChildDeleted = useCallback((id: number) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleChildOfChildCreated = useCallback(
    (parentId: number, child: GoalNodeData) => {
      setChildren((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, children: [...(c.children ?? []), child] }
            : c
        )
      );
      onChildCreated(parentId, child);
    },
    [onChildCreated]
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={cn(LEVEL_INDENT[goal.level])}>
      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div className={cn("rounded-lg overflow-hidden", LEVEL_ROW_BG[goal.level])}>
        {/* View row */}
        <div className="group flex items-center gap-2 px-3 py-2.5">
          {/* Expand toggle */}
          <button
            type="button"
            className="shrink-0 flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleToggle}
            disabled={isLoadingChildren}
          >
            {totalChildren > 0 || childrenLoaded ? (
              expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 mx-auto" />
            )}
          </button>

          {/* Name + period badge */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={cn(
                "truncate font-medium text-sm text-foreground",
                goal.level === "yearly" && "text-base font-semibold"
              )}
            >
              {goal.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 font-medium shrink-0",
                LEVEL_BADGE[goal.level]
              )}
            >
              {goal.periodLabel}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            {goal.target ? (
              <span>
                Target:{" "}
                <strong className="text-foreground">
                  {goal.target}
                  {goal.unit ? ` ${goal.unit}` : ""}
                </strong>
              </span>
            ) : (
              <span className="text-muted-foreground/40 italic">No target</span>
            )}
            {goal.actual ? (
              <span>
                Actual:{" "}
                <strong className="text-foreground">
                  {goal.actual}
                  {goal.unit ? ` ${goal.unit}` : ""}
                </strong>
              </span>
            ) : (
              <span className="text-muted-foreground/40 italic">Actual: —</span>
            )}
            <KpiStatusBadge status={goal.status as KpiStatus} size="sm" />
          </div>

          {/* Action buttons — always visible on mobile, hover on desktop */}
          {canEdit && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {childLevel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs px-2 text-muted-foreground hover:text-foreground"
                  onClick={openAddChild}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {CHILD_LABEL[goal.level]}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={openEdit}
                disabled={isEditing}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* ── Inline edit panel ─────────────────────────────────────── */}
        {isEditing && (
          <div className="border-t border-border/60 bg-muted/20 px-4 py-4 space-y-3">
            {/* Row 1: Name, Period, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Goal Name" className="sm:col-span-1">
                <Input
                  value={editValues.name}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, name: e.target.value }))
                  }
                  placeholder="Goal name"
                  className="h-8 text-sm"
                  autoFocus
                />
              </Field>
              <Field label="Period">
                <Input
                  value={editValues.periodLabel}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, periodLabel: e.target.value }))
                  }
                  placeholder={PERIOD_PLACEHOLDER[goal.level]}
                  className="h-8 text-sm"
                />
              </Field>
              <Field label="Unit">
                <Input
                  value={editValues.unit}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, unit: e.target.value }))
                  }
                  placeholder="%, Cr, units…"
                  className="h-8 text-sm"
                />
              </Field>
            </div>

            {/* Row 2: Target, Actual, Status, Higher is better */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Target">
                <Input
                  value={editValues.target}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, target: e.target.value }))
                  }
                  placeholder="e.g. 10 Cr"
                  className="h-8 text-sm"
                />
              </Field>
              <Field label="Actual">
                <Input
                  value={editValues.actual}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, actual: e.target.value }))
                  }
                  placeholder="e.g. 8.5 Cr"
                  className="h-8 text-sm"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={editValues.status || "none"}
                  onValueChange={(v) =>
                    setEditValues((prev) => ({ ...prev, status: v }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="green">🟢 Green — On Track</SelectItem>
                    <SelectItem value="yellow">🟡 Yellow — At Risk</SelectItem>
                    <SelectItem value="red">🔴 Red — Off Track</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Direction">
                <Select
                  value={editValues.higherIsBetter ? "higher" : "lower"}
                  onValueChange={(v) =>
                    setEditValues((prev) => ({
                      ...prev,
                      higherIsBetter: v === "higher",
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">↑ Higher is better</SelectItem>
                    <SelectItem value="lower">↓ Lower is better</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Row 3: Notes */}
            <Field label="Notes">
              <Textarea
                value={editValues.notes}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, notes: e.target.value }))
                }
                placeholder="Optional notes or context…"
                rows={2}
                className="text-sm resize-none"
              />
            </Field>

            {/* Save / Cancel */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="h-8 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Action items ──────────────────────────────────────────────── */}
      <KpiActionItemList
        goalId={goal.id}
        initialItems={goal.actionItems ?? []}
        canEdit={canEdit}
        defaultCollapsed
      />

      {/* ── Children ──────────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-1.5 ml-4 space-y-1.5 border-l-2 border-dashed border-border/50 pl-3">
          {isLoadingChildren && (
            <p className="text-xs text-muted-foreground py-2 px-2">Loading…</p>
          )}

          {/* Inline add-child form */}
          {isAddingChild && childLevel && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                + New {CHILD_LABEL[goal.level]} Goal
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name *">
                  <Input
                    value={addValues.name}
                    onChange={(e) =>
                      setAddValues((v) => ({ ...v, name: e.target.value }))
                    }
                    placeholder="Goal name"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </Field>
                <Field label={`Period (${PERIOD_PLACEHOLDER[childLevel]}) *`}>
                  <Input
                    value={addValues.periodLabel}
                    onChange={(e) =>
                      setAddValues((v) => ({ ...v, periodLabel: e.target.value }))
                    }
                    placeholder={PERIOD_PLACEHOLDER[childLevel]}
                    className="h-8 text-sm"
                  />
                </Field>
                <Field label="Target">
                  <Input
                    value={addValues.target}
                    onChange={(e) =>
                      setAddValues((v) => ({ ...v, target: e.target.value }))
                    }
                    placeholder="e.g. 2.5 Cr"
                    className="h-8 text-sm"
                  />
                </Field>
                <Field label="Unit">
                  <Input
                    value={addValues.unit}
                    onChange={(e) =>
                      setAddValues((v) => ({ ...v, unit: e.target.value }))
                    }
                    placeholder="%, Cr…"
                    className="h-8 text-sm"
                  />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingChild(false)}
                  disabled={isAddingSaving}
                  className="h-8 gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddChild}
                  disabled={isAddingSaving}
                  className="h-8 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isAddingSaving ? "Adding…" : `Add ${CHILD_LABEL[goal.level]}`}
                </Button>
              </div>
            </div>
          )}

          {/* Child nodes */}
          {children.map((child) => (
            <KpiGoalNode
              key={child.id}
              goal={child}
              departmentKey={departmentKey}
              canEdit={canEdit}
              depth={depth + 1}
              onUpdated={handleChildUpdated}
              onDeleted={handleChildDeleted}
              onChildCreated={handleChildOfChildCreated}
            />
          ))}

          {!isLoadingChildren && children.length === 0 && childrenLoaded && !isAddingChild && (
            <p className="text-xs text-muted-foreground/50 italic py-1 px-2">
              No {childLevel} goals yet.
              {canEdit && childLevel && (
                <button
                  type="button"
                  className="ml-1 text-primary/70 hover:text-primary underline-offset-2 hover:underline"
                  onClick={openAddChild}
                >
                  Add one
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {goal.level.charAt(0).toUpperCase() + goal.level.slice(1)} Goal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{goal.name}&quot;? All sub-goals and action items will be permanently
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
