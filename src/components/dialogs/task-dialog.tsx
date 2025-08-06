"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TaskForm, { TaskFormData } from "@/components/forms/task-form";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId?: string;
  apiEndpoint?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<TaskFormData>;
  showStatusField?: boolean;
}

export default function TaskDialog({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  apiEndpoint,
  title = "Add Task",
  description = "Create a new task for this lead.",
  submitButtonText = "Add Task",
  submitButtonLoadingText = "Adding...",
  initialData,
  showStatusField = false,
}: TaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: TaskFormData) => {
    setIsSubmitting(true);

    try {
      let endpoint = apiEndpoint;

      // If no custom endpoint provided, use lead-specific endpoint
      if (!endpoint && leadId) {
        endpoint = `/api/leads/${leadId}/tasks`;
      }

      // If still no endpoint, use general endpoint (requires leadId in body)
      if (!endpoint) {
        endpoint = "/api/tasks";
      }

      const requestBody =
        leadId && !apiEndpoint
          ? formData // Lead-specific endpoint - leadId implicit
          : { ...formData, leadId }; // General endpoint - include leadId

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create task");
      }

      // Success - close dialog and refresh
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating task:", error);
      // Could add toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            submitButtonText={submitButtonText}
            submitButtonLoadingText={submitButtonLoadingText}
            initialData={initialData}
            showStatusField={showStatusField}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
