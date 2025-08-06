"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TaskFormData {
  subject: string;
  description?: string;
  dueDate: string;
  priority: string;
  status?: string;
}

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<TaskFormData>;
  showStatusField?: boolean;
}

const TASK_PRIORITIES = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

const TASK_STATUSES = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function TaskForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Add Task",
  submitButtonLoadingText = "Adding...",
  initialData = {},
  showStatusField = false,
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    subject: initialData.subject || "",
    description: initialData.description || "",
    dueDate: initialData.dueDate || "",
    priority: initialData.priority || "Medium",
    status: initialData.status || "Pending",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    // Check if due date is in the past (optional validation)
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate < now) {
        // Allow past dates but could add warning
        // newErrors.dueDate = "Due date should be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting task form:", error);
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => handleInputChange("subject", e.target.value)}
          placeholder="Task subject"
          required
          className={errors.subject ? "border-red-500" : ""}
        />
        {errors.subject && (
          <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Task description (optional)"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => handleInputChange("dueDate", e.target.value)}
          required
          className={errors.dueDate ? "border-red-500" : ""}
        />
        {errors.dueDate && (
          <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
        )}
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => handleInputChange("priority", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showStatusField && (
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? submitButtonLoadingText : submitButtonText}
        </Button>
      </div>
    </form>
  );
}
