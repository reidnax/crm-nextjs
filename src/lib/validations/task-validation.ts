import { z } from "zod";

// Task priorities
export const TASK_PRIORITIES = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
] as const;

// Task statuses
export const TASK_STATUSES = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

// Task categories
export const TASK_CATEGORIES = [
  { value: "Follow-up", label: "Follow-up" },
  { value: "Demo", label: "Demo" },
  { value: "Proposal", label: "Proposal" },
  { value: "Research", label: "Research" },
  { value: "Meeting Prep", label: "Meeting Prep" },
  { value: "Documentation", label: "Documentation" },
  { value: "Contract", label: "Contract" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Support", label: "Support" },
  { value: "Other", label: "Other" },
] as const;

// Extract the literal types
type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];
type TaskStatus = (typeof TASK_STATUSES)[number]["value"];
type TaskCategory = (typeof TASK_CATEGORIES)[number]["value"];

// Task validation schema
export const taskValidationSchema = z.object({
  // Required fields
  subject: z
    .string()
    .min(1, "Subject is required")
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject must be less than 200 characters")
    .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, "Subject contains invalid characters"),

  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine(
      (val) => {
        if (!val) return false;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid due date format" }
    )
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        // Allow dates from 1 hour ago to accommodate timezone differences
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return date >= oneHourAgo;
      },
      { message: "Due date cannot be in the past" }
    ),

  priority: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),

  // Optional fields with validation
  description: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine((val) => val.length <= 2000, {
      message: "Description must be less than 2000 characters",
    }),

  status: z
    .enum(["Pending", "In Progress", "Completed", "Cancelled"])
    .optional()
    .default("Pending"),

  category: z
    .enum([
      "Follow-up",
      "Demo",
      "Proposal",
      "Research",
      "Meeting Prep",
      "Documentation",
      "Contract",
      "Onboarding",
      "Support",
      "Other",
    ])
    .optional()
    .default("Other"),

  estimatedHours: z
    .union([z.number(), z.string(), z.undefined(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= 0 && val <= 1000), {
      message: "Estimated hours must be between 0 and 1000",
    }),

  actualHours: z
    .union([z.number(), z.string(), z.undefined(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= 0 && val <= 1000), {
      message: "Actual hours must be between 0 and 1000",
    }),

  assignedTo: z
    .union([z.number(), z.string(), z.undefined(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = typeof val === "string" ? parseInt(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || val > 0, {
      message: "Invalid assignee selected",
    }),

  leadId: z
    .union([z.number(), z.string(), z.undefined(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = typeof val === "string" ? parseInt(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || val > 0, {
      message: "Invalid lead selected",
    }),

  reminderDate: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid reminder date format" }
    ),

  tags: z
    .array(z.string())
    .optional()
    .or(z.null())
    .transform((val) => val || [])
    .refine((val) => !val || val.length <= 10, {
      message: "Maximum 10 tags allowed",
    })
    .refine((val) => !val || val.every((tag) => tag.length <= 50), {
      message: "Each tag must be less than 50 characters",
    }),

  isRecurring: z.boolean().optional().default(false),
});

// Refinement for reminder date vs due date
export const taskValidationSchemaWithRefinements = taskValidationSchema
  .refine(
    (data) => {
      if (!data.reminderDate || !data.dueDate) return true;
      const reminderDate = new Date(data.reminderDate);
      const dueDate = new Date(data.dueDate);
      return reminderDate <= dueDate;
    },
    {
      message: "Reminder date must be before or equal to due date",
      path: ["reminderDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.actualHours || !data.estimatedHours) return true;
      return data.actualHours <= data.estimatedHours * 2; // Allow up to 2x estimated time
    },
    {
      message: "Actual hours seem unusually high compared to estimated hours",
      path: ["actualHours"],
    }
  );

// Type definitions
export type TaskFormData = z.infer<typeof taskValidationSchema>;
export type TaskFormInput = z.input<typeof taskValidationSchema>;

// Initial data type (for editing)
export interface TaskInitialData {
  id?: number;
  subject?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  category?: TaskCategory;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: number;
  leadId?: number;
  reminderDate?: string;
  tags?: string[];
  isRecurring?: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to get specific field errors
export const getFieldError = (
  fieldName: keyof TaskFormData,
  errors: Record<string, string>
): string | undefined => {
  return errors[fieldName];
};

// Helper function to format date for datetime-local input
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

// Helper function to sanitize initial data to ensure no null values
export const sanitizeTaskInitialData = (
  data: TaskInitialData = {}
): TaskFormData => {
  return {
    // Required string fields
    subject: data.subject || "",

    // Optional string fields - handle null/undefined
    description: data.description || "",

    // Date fields - handle null/undefined and format for datetime-local inputs
    dueDate: formatDateTimeLocal(data.dueDate) || "",
    reminderDate: formatDateTimeLocal(data.reminderDate) || "",

    // Enum fields with defaults
    priority: (data.priority as TaskPriority) || "Medium",
    status: (data.status as TaskStatus) || "Pending",
    category: (data.category as TaskCategory) || "Other",

    // Numeric fields - handle null/undefined properly
    estimatedHours:
      data.estimatedHours !== null && data.estimatedHours !== undefined
        ? data.estimatedHours
        : undefined,
    actualHours:
      data.actualHours !== null && data.actualHours !== undefined
        ? data.actualHours
        : undefined,
    assignedTo:
      data.assignedTo !== null && data.assignedTo !== undefined
        ? data.assignedTo
        : undefined,
    leadId:
      data.leadId !== null && data.leadId !== undefined
        ? data.leadId
        : undefined,

    // Array fields - handle null/undefined
    tags: Array.isArray(data.tags) ? data.tags : [],

    // Boolean fields
    isRecurring: Boolean(data.isRecurring),
  };
};

// Function to validate task data
export const validateTaskData = (data: TaskFormInput) => {
  return taskValidationSchemaWithRefinements.safeParse(data);
};

// Helper function to convert datetime-local format back to ISO for API
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

// Helper function to prepare form data for API submission with comprehensive sanitization
export const prepareTaskDataForAPI = (formData: TaskFormData) => {
  const apiData: any = {
    // Required fields
    subject: formData.subject?.trim() || "",

    // Optional string fields - convert empty strings to null for database
    description: formData.description?.trim() || null,

    // Date fields - format for API and handle empty strings
    dueDate: formatDateForAPI(formData.dueDate),
    reminderDate: formatDateForAPI(formData.reminderDate) || null,

    // Enum fields
    priority: formData.priority || "Medium",
    status: formData.status || "Pending",
    category: formData.category || "Other",

    // Numeric fields - convert undefined to null for database
    estimatedHours:
      formData.estimatedHours !== undefined ? formData.estimatedHours : null,
    actualHours:
      formData.actualHours !== undefined ? formData.actualHours : null,
    assignedTo: formData.assignedTo !== undefined ? formData.assignedTo : null,
    leadId: formData.leadId !== undefined ? formData.leadId : null,

    // Array fields - ensure arrays are never null
    tags: Array.isArray(formData.tags)
      ? formData.tags.filter((tag) => tag.trim())
      : [],

    // Boolean fields
    isRecurring: Boolean(formData.isRecurring),
  };

  // Remove fields that are explicitly undefined to avoid sending them to API
  Object.keys(apiData).forEach((key) => {
    if (apiData[key] === undefined) {
      delete apiData[key];
    }
  });

  return apiData;
};

// Export validation functions
export const isValidTaskData = (data: TaskFormInput): boolean => {
  return taskValidationSchemaWithRefinements.safeParse(data).success;
};

export const getTaskValidationErrors = (
  data: TaskFormInput
): Record<string, string> => {
  const result = taskValidationSchemaWithRefinements.safeParse(data);
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
