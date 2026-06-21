"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type KpiLevel = "yearly" | "quarterly" | "monthly" | "daily";

const LEVEL_CONFIG: Record<KpiLevel, { label: string; placeholder: string; hint: string }> = {
  yearly: { label: "Yearly", placeholder: "2026", hint: "Format: YYYY (e.g. 2026)" },
  quarterly: { label: "Quarterly", placeholder: "Q1-2026", hint: "Format: Q#-YYYY (e.g. Q1-2026)" },
  monthly: { label: "Monthly", placeholder: "2026-06", hint: "Format: YYYY-MM (e.g. 2026-06)" },
  daily: { label: "Daily", placeholder: "2026-06-20", hint: "Format: YYYY-MM-DD (e.g. 2026-06-20)" },
};

const STATUS_OPTIONS = [
  { value: "none", label: "Not set" },
  { value: "green", label: "Green — On Track" },
  { value: "yellow", label: "Yellow — At Risk" },
  { value: "red", label: "Red — Off Track" },
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional(),
  periodLabel: z.string().min(1, "Period label is required"),
  target: z.string().optional(),
  actual: z.string().optional(),
  status: z.string().default("none"),
  higherIsBetter: z.boolean(),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

type FormValues = z.infer<typeof formSchema>;

export interface KpiGoalData {
  id: number;
  departmentId: number;
  parentId: number | null;
  level: KpiLevel;
  name: string;
  unit?: string | null;
  periodLabel: string;
  target?: string | null;
  actual?: string | null;
  status?: string | null;
  higherIsBetter: boolean;
  notes?: string | null;
  sortOrder: number;
}

interface KpiGoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentKey: string;
  level: KpiLevel;
  parentId?: number | null;
  /** Suggested period label based on parent context */
  suggestedPeriodLabel?: string;
  existingGoal?: KpiGoalData | null;
  onSuccess: (goal: KpiGoalData) => void;
}

/** Suggest period label based on level and current date */
function defaultPeriodLabel(level: KpiLevel): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  switch (level) {
    case "yearly": return String(year);
    case "quarterly": return `Q${quarter}-${year}`;
    case "monthly": return `${year}-${month}`;
    case "daily": return `${year}-${month}-${day}`;
  }
}

export function KpiGoalForm({
  open,
  onOpenChange,
  departmentKey,
  level,
  parentId,
  suggestedPeriodLabel,
  existingGoal,
  onSuccess,
}: KpiGoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(existingGoal?.id);
  const lvlConfig = LEVEL_CONFIG[level];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      unit: "",
      periodLabel: suggestedPeriodLabel || defaultPeriodLabel(level),
      target: "",
      actual: "",
      status: "none",
      higherIsBetter: true,
      notes: "",
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (existingGoal) {
        form.reset({
          name: existingGoal.name,
          unit: existingGoal.unit ?? "",
          periodLabel: existingGoal.periodLabel,
          target: existingGoal.target ?? "",
          actual: existingGoal.actual ?? "",
          status: existingGoal.status ?? "none",
          higherIsBetter: existingGoal.higherIsBetter,
          notes: existingGoal.notes ?? "",
          sortOrder: existingGoal.sortOrder,
        });
      } else {
        form.reset({
          name: "",
          unit: "",
          periodLabel: suggestedPeriodLabel || defaultPeriodLabel(level),
          target: "",
          actual: "",
          status: "none",
          higherIsBetter: true,
          notes: "",
          sortOrder: 0,
        });
      }
    }
  }, [open, existingGoal, suggestedPeriodLabel, level, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        departmentKey,
        level,
        parentId: parentId ?? null,
        ...values,
        status: (values.status && values.status !== "none") ? values.status : null,
        unit: values.unit || null,
        target: values.target || null,
        actual: values.actual || null,
        notes: values.notes || null,
      };

      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/kpi/goals/${existingGoal!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/kpi/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save goal");
        return;
      }

      toast.success(isEditing ? "Goal updated" : "Goal created");
      onSuccess(json.data);
      onOpenChange(false);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const levelLabel = lvlConfig.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${levelLabel} Goal` : `Add ${levelLabel} Goal`}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this KPI goal."
              : `Create a new ${levelLabel.toLowerCase()} KPI goal.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name *</FormLabel>
                  <FormControl>
                    <Input placeholder={`e.g. Revenue Achievement`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="periodLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period *</FormLabel>
                    <FormControl>
                      <Input placeholder={lvlConfig.placeholder} {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">{lvlConfig.hint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="%, Cr, units…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 10 Cr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 8.5 Cr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="higherIsBetter"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label className="font-normal">
                      {field.value
                        ? "Higher is better (e.g. revenue, uptime)"
                        : "Lower is better (e.g. defects, downtime)"}
                    </Label>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
