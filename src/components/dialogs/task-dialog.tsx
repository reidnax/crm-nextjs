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
import { Button } from "@/components/ui/button";

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
  showLeadSelector?: boolean;
  onSubmitOverride?: (formData: TaskFormData, leadId?: number) => Promise<any>;
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
  showLeadSelector = false,
  onSubmitOverride,
}: TaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: TaskFormData) => {
    setIsSubmitting(true);

    try {
      // Use override function if provided (for production-level handling)
      if (onSubmitOverride) {
        const leadIdToUse =
          formData.leadId || (leadId ? parseInt(leadId) : undefined);
        await onSubmitOverride(formData, leadIdToUse);
      } else {
        // Fallback to original logic for backward compatibility
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

        // Determine if this is an edit operation (has endpoint with task ID)
        const isEditing = apiEndpoint && apiEndpoint.includes("/tasks/");
        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            error.message || `Failed to ${isEditing ? "update" : "create"} task`
          );
        }
      }

      // Success - close dialog and refresh
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error with task operation:", error);
      // Error handling is now done in the production hook
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            submitButtonText={submitButtonText}
            submitButtonLoadingText={submitButtonLoadingText}
            initialData={initialData}
            showStatusField={showStatusField}
            showLeadSelector={showLeadSelector}
            showActions={false}
          />
        </div>

        {/* Fixed Action Buttons */}
        <div className="flex gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            className="flex-1"
            onClick={() => {
              // Trigger form submission directly
              const form = document.querySelector("form");
              if (form) {
                // Use requestSubmit if available, fall back to submit event
                if (form.requestSubmit) {
                  form.requestSubmit();
                } else {
                  form.dispatchEvent(
                    new Event("submit", { bubbles: true, cancelable: true })
                  );
                }
              }
            }}
          >
            {isSubmitting ? submitButtonLoadingText : submitButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
