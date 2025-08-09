import { z } from "zod";

export const MEETING_TYPES = [
  { value: "Meeting", label: "In-Person Meeting" },
  { value: "Call", label: "Phone Call" },
  { value: "Video Call", label: "Video Call" },
  { value: "Demo", label: "Product Demo" },
] as const;

export const MEETING_STATUSES = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

export const MEETING_PRIORITIES = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
] as const;

// Extract the literal types
type MeetingType = (typeof MEETING_TYPES)[number]["value"];
type MeetingStatus = (typeof MEETING_STATUSES)[number]["value"];
type MeetingPriority = (typeof MEETING_PRIORITIES)[number]["value"];

const meetingTypeEnum = z.enum(
  MEETING_TYPES.map((t) => t.value) as ["Meeting", "Call", "Video Call", "Demo"]
);

const meetingStatusEnum = z.enum(
  MEETING_STATUSES.map((s) => s.value) as [
    "Scheduled",
    "In Progress",
    "Completed",
    "Cancelled"
  ]
);

const priorityEnum = z.enum(["High", "Medium", "Low"]);

export const meetingValidationSchema = z
  .object({
    subject: z
      .string()
      .min(1, "Subject is required")
      .min(3, "Subject must be at least 3 characters")
      .max(200, "Subject must be less than 200 characters")
      .regex(
        /^[a-zA-Z0-9\s\-_.,!?()]+$/,
        "Subject contains invalid characters"
      ),

    description: z
      .string()
      .optional()
      .or(z.null())
      .transform((val) => val || "")
      .refine((val) => val.length <= 2000, {
        message: "Description must be less than 2000 characters",
      }),

    startTime: z
      .string()
      .min(1, "Start time is required")
      .refine(
        (val) => {
          if (!val) return false;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid start time format" }
      ),

    endTime: z
      .string()
      .min(1, "End time is required")
      .refine(
        (val) => {
          if (!val) return false;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid end time format" }
      ),

    location: z
      .string()
      .optional()
      .or(z.null())
      .transform((val) => val || "")
      .refine((val) => val.length <= 500, {
        message: "Location must be less than 500 characters",
      }),

    type: meetingTypeEnum.default("Meeting"),

    status: meetingStatusEnum.default("Scheduled"),

    priority: priorityEnum.default("Medium"),

    agenda: z
      .string()
      .optional()
      .or(z.null())
      .transform((val) => val || "")
      .refine((val) => val.length <= 2000, {
        message: "Agenda must be less than 2000 characters",
      }),

    outcome: z
      .string()
      .optional()
      .or(z.null())
      .transform((val) => val || "")
      .refine((val) => val.length <= 2000, {
        message: "Outcome must be less than 2000 characters",
      }),

    attendees: z.array(z.string()).optional().default([]),

    leadId: z.number().int().positive().optional(),

    isRecurring: z.boolean().optional().default(false),
  })
  .refine(
    (data) =>
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const meetingValidationSchemaWithRefinements =
  meetingValidationSchema.refine(
    (data) => {
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);
      return endDate > startDate;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export type MeetingFormData = z.infer<typeof meetingValidationSchema>;
export type MeetingFormInput = z.input<typeof meetingValidationSchema>;

export interface MeetingInitialData {
  id?: number;
  subject?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: MeetingType;
  status?: MeetingStatus;
  priority?: MeetingPriority;
  agenda?: string;
  outcome?: string;
  attendees?: string[];
  leadId?: number;
  isRecurring?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to get field error
export const getFieldError = (
  fieldName: keyof MeetingFormData,
  errors: Record<string, string>
): string | undefined => {
  return errors[fieldName];
};

// Helper function to format datetime-local string
const formatDateTimeLocal = (dateString?: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.warn("Error formatting date for input:", dateString, error);
    return "";
  }
};

// Sanitize initial data for form
export const sanitizeMeetingInitialData = (
  data: MeetingInitialData = {}
): MeetingFormData => {
  return {
    subject: data.subject || "",
    description: data.description || "",
    startTime: formatDateTimeLocal(data.startTime) || "",
    endTime: formatDateTimeLocal(data.endTime) || "",
    location: data.location || "",
    type: data.type || "Meeting",
    status: data.status || "Scheduled",
    priority: data.priority || "Medium",
    agenda: data.agenda || "",
    outcome: data.outcome || "",
    attendees: data.attendees || [],
    leadId: data.leadId,
    isRecurring: data.isRecurring || false,
  };
};

// Validate meeting data
export const validateMeetingData = (data: MeetingFormInput) => {
  return meetingValidationSchemaWithRefinements.safeParse(data);
};

// Format date for API submission
export const formatDateForAPI = (
  dateTimeLocalString?: string
): string | undefined => {
  if (!dateTimeLocalString) return undefined;

  try {
    // datetime-local gives us YYYY-MM-DDTHH:mm format
    // We need to convert it to ISO format for API
    const date = new Date(dateTimeLocalString);
    if (isNaN(date.getTime())) return undefined;

    return date.toISOString();
  } catch (error) {
    console.warn("Error formatting date for API:", dateTimeLocalString, error);
    return undefined;
  }
};

// Prepare data for API submission
export const prepareMeetingDataForAPI = (formData: MeetingFormData) => {
  return {
    ...formData,
    startTime: formatDateForAPI(formData.startTime) || formData.startTime,
    endTime: formatDateForAPI(formData.endTime) || formData.endTime,
    attendees: formData.attendees || [],
  };
};

// Check if meeting data is valid
export const isValidMeetingData = (data: MeetingFormInput): boolean => {
  return meetingValidationSchemaWithRefinements.safeParse(data).success;
};

// Get validation errors
export const getMeetingValidationErrors = (
  data: MeetingFormInput
): Record<string, string> => {
  const result = meetingValidationSchemaWithRefinements.safeParse(data);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  result.error.issues.forEach((error) => {
    const fieldPath = error.path.join(".");
    if (!errors[fieldPath]) {
      errors[fieldPath] = error.message;
    }
  });

  return errors;
};
