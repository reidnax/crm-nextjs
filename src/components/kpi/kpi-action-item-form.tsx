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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
] as const;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  target: z.string().optional(),
  actual: z.string().optional(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["open", "in-progress", "done", "blocked"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface KpiActionItemData {
  id: number;
  title: string;
  description?: string | null;
  target?: string | null;
  actual?: string | null;
  owner?: string | null;
  dueDate?: string | Date | null;
  status: string;
  notes?: string | null;
}

interface KpiActionItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: number;
  existingItem?: KpiActionItemData | null;
  onSuccess: (item: KpiActionItemData) => void;
}

export function KpiActionItemForm({
  open,
  onOpenChange,
  goalId,
  existingItem,
  onSuccess,
}: KpiActionItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(existingItem?.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      target: "",
      actual: "",
      owner: "",
      dueDate: "",
      status: "open",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (existingItem) {
        form.reset({
          title: existingItem.title,
          description: existingItem.description ?? "",
          target: existingItem.target ?? "",
          actual: existingItem.actual ?? "",
          owner: existingItem.owner ?? "",
          dueDate: existingItem.dueDate
            ? new Date(existingItem.dueDate).toISOString().split("T")[0]
            : "",
          status: (existingItem.status as FormValues["status"]) || "open",
          notes: existingItem.notes ?? "",
        });
      } else {
        form.reset({
          title: "",
          description: "",
          target: "",
          actual: "",
          owner: "",
          dueDate: "",
          status: "open",
          notes: "",
        });
      }
    }
  }, [open, existingItem, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate || null,
      };

      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/kpi/action-items/${existingItem!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/kpi/goals/${goalId}/action-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save action item");
        return;
      }

      toast.success(isEditing ? "Action item updated" : "Action item created");
      onSuccess(json.data);
      onOpenChange(false);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Action Item" : "Add Action Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Action item title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 100%" {...field} />
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
                      <Input placeholder="e.g. 85%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Name or team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional details..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea placeholder="Additional notes..." rows={2} {...field} />
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
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
