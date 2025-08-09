"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import MeetingForm from "@/components/forms/meeting-form";
import { Button } from "@/components/ui/button";
import {
  MeetingFormData,
  MeetingInitialData,
} from "@/lib/validations/meeting-validation";
import { Meeting } from "@/components/meetings/MeetingsTable";

interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated?: (meeting: Meeting) => void;
  onMeetingUpdated?: (meeting: Meeting) => void;
  initialData?: MeetingInitialData;
  leadId?: number;
}

export default function MeetingDialog({
  isOpen,
  onClose,
  onMeetingCreated,
  onMeetingUpdated,
  initialData,
  leadId,
}: MeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (data: MeetingFormData) => {
    setIsSubmitting(true);
    setServerErrors({});

    try {
      const isUpdate = Boolean(initialData?.id);
      const url = isUpdate
        ? `/api/meetings/${initialData.id}`
        : "/api/meetings";
      const method = isUpdate ? "PUT" : "POST";

      const payload = {
        ...data,
        leadId: leadId || data.leadId,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setServerErrors(result.errors);
          return;
        }
        throw new Error(
          result.error || result.message || "Failed to save meeting"
        );
      }

      const meeting = result.data;

      if (isUpdate) {
        onMeetingUpdated?.(meeting);
        toast.success("Meeting updated successfully!");
      } else {
        onMeetingCreated?.(meeting);
        toast.success("Meeting created successfully!");
      }

      onClose();
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save meeting"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setServerErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">
            {initialData?.id ? "Edit Meeting" : "Create New Meeting"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {initialData?.id
              ? "Update meeting details and scheduling information."
              : "Schedule a new meeting with the lead."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <MeetingForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitButtonText={
              initialData?.id ? "Update Meeting" : "Create Meeting"
            }
            submitButtonLoadingText={
              initialData?.id ? "Updating..." : "Creating..."
            }
            showLeadSelector={!leadId}
            showStatusField={true}
            mode={initialData?.id ? "edit" : "create"}
            serverErrors={serverErrors}
            leadId={leadId}
            showActions={false}
          />
        </div>

        {/* Fixed Action Buttons */}
        <div className="flex gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
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
            {isSubmitting
              ? initialData?.id
                ? "Updating..."
                : "Creating..."
              : initialData?.id
              ? "Update Meeting"
              : "Create Meeting"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
