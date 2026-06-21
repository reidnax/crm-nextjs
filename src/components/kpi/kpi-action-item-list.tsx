"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, ChevronDown, ChevronRight, Check, X, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { KpiActionItemData } from "./kpi-action-item-form";
import { cn } from "@/lib/utils";

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "open", label: "Open", className: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "in-progress", label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "done", label: "Done", className: "bg-green-50 text-green-700 border-green-200" },
  { value: "blocked", label: "Blocked", className: "bg-red-50 text-red-700 border-red-200" },
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

// ─── blank row state ──────────────────────────────────────────────────────────

interface RowValues {
  title: string;
  target: string;
  actual: string;
  owner: string;
  dueDate: string;
  status: string;
  description: string;
  notes: string;
}

function blankRow(): RowValues {
  return {
    title: "",
    target: "",
    actual: "",
    owner: "",
    dueDate: "",
    status: "open",
    description: "",
    notes: "",
  };
}

function itemToRow(item: KpiActionItemData): RowValues {
  return {
    title: item.title,
    target: item.target ?? "",
    actual: item.actual ?? "",
    owner: item.owner ?? "",
    dueDate: item.dueDate
      ? new Date(item.dueDate).toISOString().split("T")[0]
      : "",
    status: item.status ?? "open",
    description: item.description ?? "",
    notes: item.notes ?? "",
  };
}

// ─── inline row editor ────────────────────────────────────────────────────────

interface InlineRowEditorProps {
  values: RowValues;
  onChange: (v: RowValues) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew?: boolean;
}

function InlineRowEditor({
  values,
  onChange,
  onSave,
  onCancel,
  isSaving,
  isNew,
}: InlineRowEditorProps) {
  const set = (key: keyof RowValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...values, [key]: e.target.value });

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2.5">
      {isNew && (
        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
          + New Action Item
        </p>
      )}

      {/* Row 1: Title (full width) */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Title *
        </label>
        <Input
          value={values.title}
          onChange={set("title")}
          placeholder="Action item title"
          className="h-8 text-sm"
          autoFocus={isNew}
        />
      </div>

      {/* Row 2: Target, Actual, Owner, Due Date */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["target", "actual", "owner"] as const).map((field) => (
          <div key={field}>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1 capitalize">
              {field}
            </label>
            <Input
              value={values[field]}
              onChange={set(field)}
              placeholder={field === "owner" ? "Name or team" : `e.g. ${field === "target" ? "100%" : "85%"}`}
              className="h-8 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
            Due Date
          </label>
          <Input
            type="date"
            value={values.dueDate}
            onChange={set("dueDate")}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 3: Status */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Status
        </label>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...values, status: opt.value })}
              className={cn(
                "px-3 h-7 text-xs rounded-full border font-medium transition-colors",
                values.status === opt.value
                  ? opt.className + " ring-1 ring-offset-1 ring-current"
                  : "bg-background text-muted-foreground border-input hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Description */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Description
        </label>
        <Input
          value={values.description}
          onChange={set("description")}
          placeholder="Optional description"
          className="h-8 text-sm"
        />
      </div>

      {/* Row 5: Notes */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Notes
        </label>
        <Textarea
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          placeholder="Optional notes"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving} className="h-7 gap-1">
          <X className="h-3 w-3" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="h-7 gap-1">
          <Check className="h-3 w-3" />
          {isSaving ? "Saving…" : isNew ? "Add Item" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface KpiActionItemListProps {
  goalId: number;
  initialItems?: KpiActionItemData[];
  canEdit: boolean;
  defaultCollapsed?: boolean;
}

export function KpiActionItemList({
  goalId,
  initialItems = [],
  canEdit,
  defaultCollapsed = false,
}: KpiActionItemListProps) {
  const [items, setItems] = useState<KpiActionItemData[]>(initialItems);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<RowValues>(blankRow());
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValues, setNewValues] = useState<RowValues>(blankRow());
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KpiActionItemData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── save edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!editValues.title.trim()) { toast.error("Title is required"); return; }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/kpi/action-items/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editValues.title.trim(),
          target: editValues.target || null,
          actual: editValues.actual || null,
          owner: editValues.owner || null,
          dueDate: editValues.dueDate || null,
          status: editValues.status,
          description: editValues.description || null,
          notes: editValues.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to save"); return; }
      setItems((prev) => prev.map((i) => (i.id === editingId ? json.data : i)));
      toast.success("Action item updated");
      setEditingId(null);
    } catch { toast.error("Unexpected error"); }
    finally { setIsSavingEdit(false); }
  }, [editingId, editValues]);

  // ── save new ─────────────────────────────────────────────────────────────
  const handleSaveNew = useCallback(async () => {
    if (!newValues.title.trim()) { toast.error("Title is required"); return; }
    setIsSavingNew(true);
    try {
      const res = await fetch(`/api/kpi/goals/${goalId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newValues.title.trim(),
          target: newValues.target || null,
          actual: newValues.actual || null,
          owner: newValues.owner || null,
          dueDate: newValues.dueDate || null,
          status: newValues.status,
          description: newValues.description || null,
          notes: newValues.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to add"); return; }
      setItems((prev) => [...prev, json.data]);
      toast.success("Action item added");
      setIsAddingNew(false);
      setNewValues(blankRow());
    } catch { toast.error("Unexpected error"); }
    finally { setIsSavingNew(false); }
  }, [goalId, newValues]);

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/kpi/action-items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || "Failed"); return; }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("Deleted");
    } catch { toast.error("Unexpected error"); }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  }, [deleteTarget]);

  const openEdit = (item: KpiActionItemData) => {
    setEditingId(item.id);
    setEditValues(itemToRow(item));
    setIsAddingNew(false);
  };

  const openAdd = () => {
    setNewValues(blankRow());
    setIsAddingNew(true);
    setEditingId(null);
    if (collapsed) setCollapsed(false);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-1 ml-5">
      {/* Toggle header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          <span>Action Items ({items.length})</span>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-1.5 space-y-1.5 border-l-2 border-dashed border-border/40 pl-3">
          {/* Existing items */}
          {items.map((item) => {
            const statusCfg = STATUS_MAP[item.status] ?? STATUS_MAP.open;
            const isEditingThis = editingId === item.id;

            return (
              <div key={item.id}>
                {isEditingThis ? (
                  <InlineRowEditor
                    values={editValues}
                    onChange={setEditValues}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                    isSaving={isSavingEdit}
                  />
                ) : (
                  <div className="group flex items-start gap-2 rounded-md hover:bg-muted/40 px-2 py-1.5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{item.title}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 font-medium", statusCfg.className)}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.dueDate && (
                          <span>Due: {format(new Date(item.dueDate), "dd MMM yyyy")}</span>
                        )}
                        {item.target && <span>Target: {item.target}</span>}
                        {item.actual && <span>Actual: {item.actual}</span>}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive/60 hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && !isAddingNew && (
            <p className="text-[11px] text-muted-foreground/50 italic py-1">No action items yet.</p>
          )}

          {/* Inline new item form */}
          {isAddingNew && (
            <InlineRowEditor
              values={newValues}
              onChange={setNewValues}
              onSave={handleSaveNew}
              onCancel={() => setIsAddingNew(false)}
              isSaving={isSavingNew}
              isNew
            />
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Item</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
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
