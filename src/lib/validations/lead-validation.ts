import { z } from "zod";

// Social Media validation schema
const socialMediaSchema = z.object({
  linkedin: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.includes("linkedin.com") || val.startsWith("http");
      },
      { message: "LinkedIn URL must be a valid URL" }
    ),

  twitter: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return (
          val.includes("twitter.com") ||
          val.includes("x.com") ||
          val.startsWith("http")
        );
      },
      { message: "Twitter URL must be a valid URL" }
    ),

  facebook: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.includes("facebook.com") || val.startsWith("http");
      },
      { message: "Facebook URL must be a valid URL" }
    ),

  instagram: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.includes("instagram.com") || val.startsWith("http");
      },
      { message: "Instagram URL must be a valid URL" }
    ),

  website: z
    .string()
    .optional()
    .or(z.null())
    .transform((val) => val || ""),
});

// Dealer information validation schema
const dealerSchema = z
  .object({
    date: z.string().optional(),
    evBusiness: z.string().optional(),
    evBusinessStatus: z.string().optional(),
    longTermGoals: z.string().optional(),
    achieveAvoid: z.string().optional(),
    goalBarrier: z.string().optional(),
    problems: z.array(z.string()).optional(),
    improvementInterest: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.array(z.string())]).optional());

// Phone number validation regex
const phoneRegex = /^[\+]?[(]?[\d\s\-\+\(\)]{10,15}$/;

// Indian pincode validation
const indiaPin = /^[1-9][0-9]{5}$/;

// Main lead validation schema
export const leadValidationSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s\.'-]+$/,
      "Name can only contain letters, spaces, dots, apostrophes, and hyphens"
    ),

  // Optional but validated fields
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      { message: "Please enter a valid email address" }
    ),

  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return phoneRegex.test(val.replace(/\s/g, ""));
      },
      { message: "Please enter a valid phone number (10-15 digits)" }
    ),

  alternatePhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return phoneRegex.test(val.replace(/\s/g, ""));
      },
      { message: "Please enter a valid alternate phone number" }
    ),

  company: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length >= 2 && val.length <= 200;
      },
      { message: "Company name must be between 2 and 200 characters" }
    ),

  businessCategory: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || ""),

  businessIndustry: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length <= 100;
      },
      { message: "Business industry must be less than 100 characters" }
    ),

  // Status fields with validation
  status: z.string().min(1, "Status is required"),

  subStatus: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || ""),

  convertedStatus: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || ""),

  priority: z.string().min(1, "Priority is required"),

  // Location fields
  state: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length >= 2 && val.length <= 50;
      },
      { message: "State must be between 2 and 50 characters" }
    ),

  city: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length >= 2 && val.length <= 50;
      },
      { message: "City must be between 2 and 50 characters" }
    ),

  address: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length <= 500;
      },
      { message: "Address must be less than 500 characters" }
    ),

  pincode: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        // Support international postal codes
        return /^[A-Za-z0-9\s\-]{3,10}$/.test(val);
      },
      { message: "Please enter a valid postal/ZIP code" }
    ),

  // Web presence
  website: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return /^https?:\/\/.+\..+/.test(val);
      },
      {
        message:
          "Website must be a valid URL starting with http:// or https://",
      }
    ),

  // Additional information
  description: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length <= 2000;
      },
      { message: "Description must be less than 2000 characters" }
    ),

  designation: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.length <= 100;
      },
      { message: "Designation must be less than 100 characters" }
    ),

  // Financial fields
  annualRevenue: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        // Allow currency symbols and numbers
        return /^[\$₹€£¥]?[\d,\s]+\.?\d*$/.test(val.replace(/,/g, ""));
      },
      { message: "Please enter a valid revenue amount" }
    ),

  investmentLimit: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return /^[\$₹€£¥]?[\d,\s]+\.?\d*$/.test(val.replace(/,/g, ""));
      },
      { message: "Please enter a valid investment amount" }
    ),

  source: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || ""),

  // Arrays and objects
  tags: z
    .array(z.string())
    .optional()
    .default([])
    .refine(
      (val) => {
        if (!val) return true;
        return val.every((tag) => tag.length <= 50);
      },
      { message: "Each tag must be less than 50 characters" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        return val.length <= 20;
      },
      { message: "Maximum 20 tags allowed" }
    ),

  dealer: dealerSchema.optional().default({}),
  socialMedia: socialMediaSchema.optional().default({}),

  // Date fields
  lastContactDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: "Last contact date cannot be in the future" }
    ),

  nextFollowUpDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((val) => val || "")
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Please enter a valid follow-up date" }
    ),

  // Lead score
  leadScore: z
    .number()
    .min(0, "Lead score cannot be negative")
    .max(100, "Lead score cannot exceed 100")
    .default(0),
});

// Type inference
export type LeadFormData = z.infer<typeof leadValidationSchema>;

// Interface for initial data that may have null values from database
export interface LeadInitialData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  company?: string | null;
  businessCategory?: string | null;
  businessIndustry?: string | null;
  status?: string;
  subStatus?: string | null;
  convertedStatus?: string | null;
  priority?: "Low" | "Medium" | "High";
  state?: string | null;
  city?: string | null;
  address?: string | null;
  pincode?: string | null;
  website?: string | null;
  description?: string | null;
  designation?: string | null;
  annualRevenue?: string | null;
  investmentLimit?: string | null;
  source?: string | null;
  tags?: string[] | null;
  dealer?: any;
  socialMedia?: {
    linkedin?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    website?: string | null;
  } | null;
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  leadScore?: number;
}

// Validation helper functions
export const validateLeadData = (data: unknown) => {
  return leadValidationSchema.safeParse(data);
};

export const getFieldError = (
  errors: any,
  field: string
): string | undefined => {
  if (!errors || !errors[field]) return undefined;

  if (typeof errors[field]?.message === "string") {
    return errors[field].message;
  }

  // Handle nested errors
  if (errors[field] && typeof errors[field] === "object") {
    const firstError = Object.values(errors[field])[0];
    if (
      firstError &&
      typeof firstError === "object" &&
      "message" in firstError
    ) {
      return (firstError as any).message;
    }
  }

  return "This field has an error";
};

// Constants for form options
export const LEAD_STATUSES = [
  "New",
  "Unassigned",
  "To be contacted",
  "Attempted to contact",
  "Contacted",
  "Contact in future",
  "Qualified",
  "Not Qualified",
  "Meeting",
  "Product/Plant Visit",
  "Converted",
  "Not Converted",
] as const;

export const SUB_STATUSES = ["Hot", "Warm", "Cold"] as const;

export const CONVERTED_STATUSES = [
  "Won",
  "Lost",
  "Pending",
  "On Hold",
] as const;

export const PRIORITIES = ["Low", "Medium", "High"] as const;

export const BUSINESS_CATEGORIES = [
  "Manufacturing",
  "Trading",
  "Service",
  "Retail",
  "Technology",
  "Healthcare",
  "Education",
  "Other",
] as const;

export const LEAD_SOURCES = [
  "Website",
  "Social Media",
  "Referral",
  "Cold Call",
  "Email Campaign",
  "Trade Show",
  "Advertisement",
  "Other",
] as const;
