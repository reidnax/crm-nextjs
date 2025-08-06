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

export interface MeetingFormData {
  subject: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
}

interface MeetingFormProps {
  onSubmit: (data: MeetingFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<MeetingFormData>;
}

const MEETING_TYPES = [
  { value: "Meeting", label: "In-Person Meeting" },
  { value: "Call", label: "Phone Call" },
  { value: "Video Call", label: "Video Call" },
  { value: "Demo", label: "Product Demo" },
];

export default function MeetingForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Schedule",
  submitButtonLoadingText = "Scheduling...",
  initialData = {},
}: MeetingFormProps) {
  const [formData, setFormData] = useState<MeetingFormData>({
    subject: initialData.subject || "",
    description: initialData.description || "",
    startTime: initialData.startTime || "",
    endTime: initialData.endTime || "",
    location: initialData.location || "",
    type: initialData.type || "Meeting",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = "End time must be after start time";
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
      console.error("Error submitting meeting form:", error);
    }
  };

  const handleInputChange = (field: keyof MeetingFormData, value: string) => {
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
          placeholder="Meeting subject"
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
          placeholder="Meeting description (optional)"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => handleInputChange("startTime", e.target.value)}
            required
            className={errors.startTime ? "border-red-500" : ""}
          />
          {errors.startTime && (
            <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
          )}
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => handleInputChange("endTime", e.target.value)}
            required
            className={errors.endTime ? "border-red-500" : ""}
          />
          {errors.endTime && (
            <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleInputChange("location", e.target.value)}
          placeholder="Meeting location or URL"
        />
      </div>

      <div>
        <Label htmlFor="type">Meeting Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => handleInputChange("type", value)}
        >
          <SelectTrigger>
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
      </div>

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
