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

export interface NoteFormData {
  subject: string;
  description: string;
  type: string;
}

interface NoteFormProps {
  onSubmit: (data: NoteFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  initialData?: Partial<NoteFormData>;
}

const NOTE_TYPES = [
  { value: "General", label: "General" },
  { value: "Call Log", label: "Call Log" },
  { value: "Meeting Summary", label: "Meeting Summary" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Research", label: "Research" },
  { value: "Demo Notes", label: "Demo Notes" },
  { value: "Quote Discussion", label: "Quote Discussion" },
  { value: "Support Request", label: "Support Request" },
];

export default function NoteForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Add Note",
  submitButtonLoadingText = "Adding...",
  initialData = {},
}: NoteFormProps) {
  const [formData, setFormData] = useState<NoteFormData>({
    subject: initialData.subject || "",
    description: initialData.description || "",
    type: initialData.type || "General",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.description.length > 5000) {
      newErrors.description = "Description must be less than 5000 characters";
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
      console.error("Error submitting note form:", error);
    }
  };

  const handleInputChange = (field: keyof NoteFormData, value: string) => {
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
          placeholder="Note subject"
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
          placeholder="Note content"
          rows={6}
          required
          className={errors.description ? "border-red-500" : ""}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {formData.description.length}/5000 characters
        </p>
      </div>

      <div>
        <Label htmlFor="type">Note Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => handleInputChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((type) => (
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
