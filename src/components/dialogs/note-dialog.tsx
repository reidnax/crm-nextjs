"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NoteForm, { NoteFormData } from "@/components/forms/note-form";

interface NoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId?: string;
  apiEndpoint?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<NoteFormData>;
}

export default function NoteDialog({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  apiEndpoint,
  title = "Add Note",
  description = "Add a note about this lead.",
  submitButtonText = "Add Note",
  submitButtonLoadingText = "Adding...",
  initialData,
}: NoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: NoteFormData) => {
    setIsSubmitting(true);

    try {
      let endpoint = apiEndpoint;

      // If no custom endpoint provided, use lead-specific endpoint
      if (!endpoint && leadId) {
        endpoint = `/api/leads/${leadId}/notes`;
      }

      // If still no endpoint, use general endpoint (requires leadId in body)
      if (!endpoint) {
        endpoint = "/api/notes";
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
        throw new Error(error.message || "Failed to create note");
      }

      // Success - close dialog and refresh
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating note:", error);
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
          <NoteForm
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
