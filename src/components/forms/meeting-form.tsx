"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, Users, FileText, Target } from "lucide-react";
import LeadSelector from "./LeadSelector";
import {
  meetingValidationSchemaWithRefinements,
  type MeetingFormData,
  type MeetingInitialData,
  sanitizeMeetingInitialData,
  prepareMeetingDataForAPI,
  MEETING_TYPES,
  MEETING_STATUSES,
  MEETING_PRIORITIES,
} from "@/lib/validations/meeting-validation";

interface MeetingFormProps {
  onSubmit: (data: MeetingFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: MeetingInitialData;
  showStatusField?: boolean;
  showLeadSelector?: boolean;
  mode?: "create" | "edit";
  serverErrors?: Record<string, string>;
  leadId?: number;
  showActions?: boolean;
}

export default function MeetingForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Add Meeting",
  submitButtonLoadingText = "Adding...",
  initialData = {},
  showStatusField = false,
  showLeadSelector = false,
  mode = "create",
  serverErrors = {},
  leadId,
  showActions = true,
}: MeetingFormProps) {
  const [attendeeInput, setAttendeeInput] = useState("");

  // Setup react-hook-form with validation
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
    clearErrors,
    reset,
  } = useForm({
    resolver: zodResolver(meetingValidationSchemaWithRefinements),
    defaultValues: sanitizeMeetingInitialData(initialData),
    mode: "onChange",
  });

  // Watch form values for dynamic validation
  const watchedValues = watch();

  // Set server errors
  useEffect(() => {
    Object.entries(serverErrors).forEach(([field, message]) => {
      setError(field as keyof MeetingFormData, {
        type: "server",
        message,
      });
    });
  }, [serverErrors, setError]);

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const newSanitizedData = sanitizeMeetingInitialData(initialData);
      reset(newSanitizedData);
    }
  }, [initialData, reset]);

  // Auto-set end time when start time changes (default 1 hour duration)
  useEffect(() => {
    const startTime = watchedValues.startTime;
    if (startTime && !initialData?.endTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour

      // Format for datetime-local input (YYYY-MM-DDTHH:mm)
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, "0");
      const day = String(endDate.getDate()).padStart(2, "0");
      const hours = String(endDate.getHours()).padStart(2, "0");
      const minutes = String(endDate.getMinutes()).padStart(2, "0");

      const formattedEndTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setValue("endTime", formattedEndTime);
    }
  }, [watchedValues.startTime, setValue, initialData?.endTime]);

  // Handle attendee operations
  const handleAddAttendee = () => {
    const attendee = attendeeInput.trim();
    const currentAttendees = watchedValues.attendees || [];

    if (
      attendee &&
      !currentAttendees.includes(attendee) &&
      currentAttendees.length < 10
    ) {
      setValue("attendees", [...currentAttendees, attendee], {
        shouldValidate: true,
      });
      setAttendeeInput("");
    }
  };

  const handleRemoveAttendee = (attendeeToRemove: string) => {
    const currentAttendees = watchedValues.attendees || [];
    setValue(
      "attendees",
      currentAttendees.filter((attendee) => attendee !== attendeeToRemove),
      { shouldValidate: true }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAttendee();
    }
  };

  // Form submission
  const onFormSubmit = async (data: MeetingFormData) => {
    try {
      // Additional validation for required fields based on context
      if (showLeadSelector && !data.leadId) {
        setError("leadId", {
          type: "required",
          message: "Lead is required",
        });
        return;
      }

      // Prepare data for API submission (convert dates to ISO format)
      const apiData = prepareMeetingDataForAPI(data);
      await onSubmit(apiData);
    } catch (error) {
      console.error("Error submitting meeting form:", error);
    }
  };

  // Helper to get error message
  const getErrorMessage = (
    fieldName: keyof MeetingFormData
  ): string | undefined => {
    return errors[fieldName]?.message;
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Server Errors Alert */}
      {Object.keys(serverErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the errors below and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="subject"
                placeholder="Meeting subject"
                className={getErrorMessage("subject") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("subject") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("subject")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                id="description"
                placeholder="Meeting description (optional)"
                rows={3}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={
                  getErrorMessage("description") ? "border-red-500" : ""
                }
              />
            )}
          />
          {getErrorMessage("description") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("description")}
            </p>
          )}
        </div>
      </div>

      {/* Lead Selection - only show when creating standalone meetings */}
      {showLeadSelector && (
        <Controller
          name="leadId"
          control={control}
          render={({ field }) => (
            <LeadSelector
              selectedLeadId={
                typeof field.value === "number" ? field.value : undefined
              }
              onLeadSelect={(leadId) => {
                field.onChange(leadId);
                if (leadId) {
                  clearErrors("leadId");
                }
              }}
              label="Lead"
              required={true}
              error={getErrorMessage("leadId")}
              placeholder="Search and select a lead..."
            />
          )}
        />
      )}

      {/* Meeting Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input
                id="startTime"
                type="datetime-local"
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={getErrorMessage("startTime") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("startTime") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("startTime")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input
                id="endTime"
                type="datetime-local"
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={getErrorMessage("endTime") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("endTime") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("endTime")}
            </p>
          )}
        </div>
      </div>

      {/* Type and Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Meeting Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={getErrorMessage("type") ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {getErrorMessage("type") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("type")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={
                    getErrorMessage("priority") ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {getErrorMessage("priority") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("priority")}
            </p>
          )}
        </div>
      </div>

      {/* Status Field */}
      {showStatusField && (
        <div>
          <Label htmlFor="status">Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={getErrorMessage("status") ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {getErrorMessage("status") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("status")}
            </p>
          )}
        </div>
      )}

      {/* Location */}
      <div>
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="location"
              placeholder="Meeting location or video call link..."
              className={getErrorMessage("location") ? "border-red-500" : ""}
              value={field.value || ""}
            />
          )}
        />
        {getErrorMessage("location") && (
          <p className="text-red-500 text-sm mt-1">
            {getErrorMessage("location")}
          </p>
        )}
      </div>

      {/* Attendees */}
      <div>
        <Label htmlFor="attendees" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Attendees
        </Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="attendees"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add attendee name or email and press Enter"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddAttendee}
              variant="outline"
              size="sm"
              disabled={(watchedValues.attendees?.length || 0) >= 10}
            >
              Add
            </Button>
          </div>
          {watchedValues.attendees && watchedValues.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {watchedValues.attendees.map((attendee, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  {attendee}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendee(attendee)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {getErrorMessage("attendees") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("attendees")}
            </p>
          )}
        </div>
      </div>

      {/* Additional Fields */}
      <div className="space-y-4">
        {/* Agenda */}
        <div>
          <Label htmlFor="agenda" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Agenda
          </Label>
          <Controller
            name="agenda"
            control={control}
            render={({ field }) => (
              <Textarea
                id="agenda"
                placeholder="Meeting agenda (optional)"
                rows={2}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={getErrorMessage("agenda") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("agenda") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("agenda")}
            </p>
          )}
        </div>

        {/* Outcome */}
        <div>
          <Label htmlFor="outcome" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Outcome
          </Label>
          <Controller
            name="outcome"
            control={control}
            render={({ field }) => (
              <Textarea
                id="outcome"
                placeholder="Meeting outcome or results (optional)"
                rows={2}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={getErrorMessage("outcome") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("outcome") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("outcome")}
            </p>
          )}
        </div>
      </div>

      {/* Recurring Meeting */}
      <div className="flex items-center space-x-2">
        <Controller
          name="isRecurring"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="isRecurring"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isRecurring" className="text-sm font-medium">
          Make this a recurring meeting
        </Label>
      </div>

      {/* Form Actions */}
      {showActions && (
        <div className="flex gap-2 pt-4 border-t">
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
      )}
    </form>
  );
}
