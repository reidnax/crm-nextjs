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
import { AlertCircle } from "lucide-react";
import { AssigneeDropdown } from "@/components/leads/lead-field-dropdowns";
import LeadSelector from "./LeadSelector";
import {
  taskValidationSchemaWithRefinements,
  type TaskFormData,
  type TaskInitialData,
  sanitizeTaskInitialData,
  prepareTaskDataForAPI,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CATEGORIES,
} from "@/lib/validations/task-validation";

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: TaskInitialData;
  showStatusField?: boolean;
  showLeadSelector?: boolean;
  mode?: "create" | "edit";
  serverErrors?: Record<string, string>;
  showActions?: boolean;
}

export default function TaskForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Add Task",
  submitButtonLoadingText = "Adding...",
  initialData = {},
  showStatusField = false,
  showLeadSelector = false,
  mode = "create",
  serverErrors = {},
  showActions = true,
}: TaskFormProps) {
  const [tagInput, setTagInput] = useState("");
  const [currentAssigneeName, setCurrentAssigneeName] = useState<
    string | undefined
  >(undefined);
  const [assigneesCache, setAssigneesCache] = useState<
    Array<{ id: number; name: string }>
  >([]);

  // Sanitize initial data
  const sanitizedData = sanitizeTaskInitialData(initialData);

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
    resolver: zodResolver(taskValidationSchemaWithRefinements),
    defaultValues: sanitizedData,
    mode: "onChange",
  });

  // Watch form values for dynamic validation
  const watchedValues = watch();

  // Set server errors
  useEffect(() => {
    Object.entries(serverErrors).forEach(([field, message]) => {
      setError(field as keyof TaskFormData, {
        type: "server",
        message,
      });
    });
  }, [serverErrors, setError]);

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const newSanitizedData = sanitizeTaskInitialData(initialData);
      reset(newSanitizedData);
    }
  }, [initialData, mode, reset]);

  // Fetch current assignee name when assignee ID changes
  useEffect(() => {
    const currentAssigneeId = watchedValues.assignedTo;

    if (currentAssigneeId) {
      // Check cache first
      const cachedAssignee = assigneesCache.find(
        (a) => a.id === currentAssigneeId
      );

      if (cachedAssignee) {
        setCurrentAssigneeName(cachedAssignee.name);
      } else if (assigneesCache.length === 0) {
        // Only fetch if cache is empty
        fetch("/api/assignees?pageSize=50", { cache: "no-store" })
          .then((response) => response.json())
          .then((result) => {
            if (result.success) {
              const assignees = result.data.assignees.map(
                (a: { id: number; name: string }) => ({
                  id: a.id,
                  name: a.name,
                })
              );
              setAssigneesCache(assignees);

              const assignee = assignees.find(
                (a: { id: number; name: string }) => a.id === currentAssigneeId
              );
              setCurrentAssigneeName(assignee?.name);
            }
          })
          .catch((error) => {
            console.error("Error fetching assignee name:", error);
            setCurrentAssigneeName(undefined);
          });
      }
    } else {
      setCurrentAssigneeName(undefined);
    }
  }, [watchedValues.assignedTo, assigneesCache]);

  // Handle tag operations
  const handleAddTag = () => {
    const tag = tagInput.trim();
    const currentTags = watchedValues.tags || [];

    if (tag && !currentTags.includes(tag) && currentTags.length < 10) {
      setValue("tags", [...currentTags, tag], { shouldValidate: true });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedValues.tags || [];
    setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove),
      { shouldValidate: true }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Form submission
  const onFormSubmit = async (data: TaskFormData) => {
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
      const apiData = prepareTaskDataForAPI(data);
      await onSubmit(apiData);
    } catch (error) {
      console.error("Error submitting task form:", error);
      // Handle any submission errors here
    }
  };

  // Helper to get error message
  const getErrorMessage = (
    fieldName: keyof TaskFormData
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
                placeholder="Task subject"
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
                placeholder="Task description (optional)"
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

      {/* Lead Selection - only show when creating standalone tasks */}
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

      {/* Task Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">Due Date *</Label>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <Input
                id="dueDate"
                type="datetime-local"
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={getErrorMessage("dueDate") ? "border-red-500" : ""}
              />
            )}
          />
          {getErrorMessage("dueDate") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("dueDate")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="reminderDate">Reminder Date</Label>
          <Controller
            name="reminderDate"
            control={control}
            render={({ field }) => (
              <Input
                id="reminderDate"
                type="datetime-local"
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={
                  getErrorMessage("reminderDate") ? "border-red-500" : ""
                }
              />
            )}
          />
          {getErrorMessage("reminderDate") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("reminderDate")}
            </p>
          )}
        </div>
      </div>

      {/* Priority and Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {TASK_PRIORITIES.map((priority) => (
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

        <div>
          <Label htmlFor="category">Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={
                    getErrorMessage("category") ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {getErrorMessage("category") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("category")}
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
                  {TASK_STATUSES.map((status) => (
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

      {/* Assignment */}
      <div>
        <Label htmlFor="assignedTo">Assign To</Label>
        <Controller
          name="assignedTo"
          control={control}
          render={({ field }) => (
            <AssigneeDropdown
              currentAssigneeId={
                typeof field.value === "number" ? field.value : undefined
              }
              currentAssigneeName={currentAssigneeName}
              onAssigneeChange={(assigneeId) => {
                field.onChange(assigneeId);
              }}
              className="w-full justify-start"
            />
          )}
        />
        {getErrorMessage("assignedTo") && (
          <p className="text-red-500 text-sm mt-1">
            {getErrorMessage("assignedTo")}
          </p>
        )}
      </div>

      {/* Time Tracking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Controller
            name="estimatedHours"
            control={control}
            render={({ field }) => (
              <Input
                ref={field.ref}
                name={field.name}
                value={
                  field.value !== undefined && field.value !== null
                    ? String(field.value)
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(
                    value === "" ? undefined : parseFloat(value) || undefined
                  );
                }}
                onBlur={field.onBlur}
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="0.0"
                className={
                  getErrorMessage("estimatedHours") ? "border-red-500" : ""
                }
              />
            )}
          />
          {getErrorMessage("estimatedHours") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("estimatedHours")}
            </p>
          )}
        </div>

        {showStatusField && (
          <div>
            <Label htmlFor="actualHours">Actual Hours</Label>
            <Controller
              name="actualHours"
              control={control}
              render={({ field }) => (
                <Input
                  ref={field.ref}
                  name={field.name}
                  value={
                    field.value !== undefined && field.value !== null
                      ? String(field.value)
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(
                      value === "" ? undefined : parseFloat(value) || undefined
                    );
                  }}
                  onBlur={field.onBlur}
                  id="actualHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  className={
                    getErrorMessage("actualHours") ? "border-red-500" : ""
                  }
                />
              )}
            />
            {getErrorMessage("actualHours") && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage("actualHours")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <Label htmlFor="tags">Tags</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a tag and press Enter"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              size="sm"
              disabled={(watchedValues.tags?.length || 0) >= 10}
            >
              Add
            </Button>
          </div>
          {watchedValues.tags && watchedValues.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {watchedValues.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {getErrorMessage("tags") && (
            <p className="text-red-500 text-sm mt-1">
              {getErrorMessage("tags")}
            </p>
          )}
        </div>
      </div>

      {/* Recurring Task */}
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
          Make this a recurring task
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
