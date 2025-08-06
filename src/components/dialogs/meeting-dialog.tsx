"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MeetingForm, { MeetingFormData } from "@/components/forms/meeting-form";

interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId?: string;
  apiEndpoint?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<MeetingFormData>;
}

export default function MeetingDialog({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  apiEndpoint,
  title = "Schedule Meeting",
  description = "Schedule a new meeting for this lead.",
  submitButtonText = "Schedule",
  submitButtonLoadingText = "Scheduling...",
  initialData,
}: MeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: MeetingFormData) => {
    setIsSubmitting(true);

    try {
      let endpoint = apiEndpoint;

      // If no custom endpoint provided, use lead-specific endpoint
      if (!endpoint && leadId) {
        endpoint = `/api/leads/${leadId}/meetings`;
      }

      // If still no endpoint, use general endpoint (requires leadId in body)
      if (!endpoint) {
        endpoint = "/api/meetings";
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
        throw new Error(error.message || "Failed to schedule meeting");
      }

      // Success - close dialog and refresh
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error scheduling meeting:", error);
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
          <MeetingForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            submitButtonText={submitButtonText}
            submitButtonLoadingText={submitButtonLoadingText}
            initialData={initialData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
