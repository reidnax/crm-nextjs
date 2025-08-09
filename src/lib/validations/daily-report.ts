import { z } from "zod";

// Base validation for daily report creation
export const DailyReportCreateSchema = z.object({
  // Report date - must be a valid date
  reportDate: z.date(),

  // Zone/state - non-empty string (allows "create new" behavior)
  zone: z.string().min(1, "Zone is required"),

  // Sales units - non-negative integer
  salesUnitsToday: z.number().int().min(0, "Sales units must be non-negative"),

  // Collections amount - non-negative number with 2 decimal precision
  collectionsTodayINR: z
    .number()
    .min(0, "Collections amount must be non-negative"),

  // Visit counts - non-negative integers
  dealerMeetingsCount: z
    .number()
    .int()
    .min(0, "Dealer meetings count must be non-negative"),
  plantVisitsCount: z
    .number()
    .int()
    .min(0, "Plant visits count must be non-negative"),
  newDealershipVisitsCount: z
    .number()
    .int()
    .min(0, "New dealership visits count must be non-negative"),

  // Optional notes
  notes: z.string().optional(),

  // Optional geolocation fields
  geoCity: z.string().optional(),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLon: z.number().min(-180).max(180).optional(),

  // Executive ID (for managers/admins creating reports for others)
  executiveId: z.number().int().positive().optional(),
});

// Schema for API requests (with string to date conversion)
export const DailyReportCreateAPISchema = z.object({
  // Report date as ISO string that gets converted to Date (normalized to start of day)
  reportDate: z
    .string()
    .datetime()
    .transform((str) => {
      // Parse the datetime string and extract just the date part
      // Store as YYYY-MM-DD at midnight UTC to avoid timezone issues
      const dateStr = str.split("T")[0]; // Get just the date part (YYYY-MM-DD)
      return new Date(dateStr + "T00:00:00.000Z"); // Force UTC midnight for the date
    }),

  // Zone/state - non-empty string
  zone: z.string().min(1, "Zone is required"),

  // Sales units - convert string to number and validate
  salesUnitsToday: z.coerce
    .number()
    .int()
    .min(0, "Sales units must be non-negative"),

  // Collections amount - convert string to number and validate with precision
  collectionsTodayINR: z.coerce
    .number()
    .min(0, "Collections amount must be non-negative")
    .refine((val) => {
      const str = val.toString();
      const decimalPlaces = str.includes(".")
        ? str.split(".")[1]?.length || 0
        : 0;
      return decimalPlaces <= 2;
    }, "Collections amount can have at most 2 decimal places"),

  // Visit counts - convert strings to numbers and validate
  dealerMeetingsCount: z.coerce
    .number()
    .int()
    .min(0, "Dealer meetings count must be non-negative"),
  plantVisitsCount: z.coerce
    .number()
    .int()
    .min(0, "Plant visits count must be non-negative"),
  newDealershipVisitsCount: z.coerce
    .number()
    .int()
    .min(0, "New dealership visits count must be non-negative"),

  // Optional notes
  notes: z.string().optional(),

  // Optional geolocation fields
  geoCity: z.string().optional(),
  geoLat: z.coerce.number().min(-90).max(90).optional(),
  geoLon: z.coerce.number().min(-180).max(180).optional(),

  // Executive ID (for managers/admins)
  executiveId: z.coerce.number().int().positive().optional(),
});

// Schema for query parameters in GET requests
export const DailyReportQuerySchema = z.object({
  // Date filter (ISO string)
  date: z.string().datetime().optional(),

  // Date range filters
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  // Month range filters (alternative to from/to)
  fromMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
  toMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),

  // Filter by specific executive (for managers/admins)
  executiveId: z.coerce.number().int().positive().optional(),

  // Filter by zone
  zone: z.string().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Schema for overview/analytics queries
export const DailyReportOverviewQuerySchema = z
  .object({
    // Date range filters (required for overview)
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),

    // Month range filters (alternative)
    fromMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
      .optional(),
    toMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
      .optional(),

    // Filters
    executiveId: z.coerce.number().int().positive().optional(),
    zone: z.string().optional(),
  })
  .refine(
    (data) => {
      // Either date range or month range must be provided
      const hasDateRange = data.from && data.to;
      const hasMonthRange = data.fromMonth && data.toMonth;
      return hasDateRange || hasMonthRange;
    },
    {
      message:
        "Either date range (from/to) or month range (fromMonth/toMonth) must be provided",
    }
  );

// Response type helpers
export type DailyReportCreate = z.infer<typeof DailyReportCreateSchema>;
export type DailyReportCreateAPI = z.infer<typeof DailyReportCreateAPISchema>;
export type DailyReportQuery = z.infer<typeof DailyReportQuerySchema>;
export type DailyReportOverviewQuery = z.infer<
  typeof DailyReportOverviewQuerySchema
>;

// Database model type (mirrors Prisma model)
export interface DailyActivityReport {
  id: string;
  reportDate: Date;
  executiveId: number;
  zone: string;
  salesUnitsToday: number;
  collectionsTodayINR: number;
  dealerMeetingsCount: number;
  plantVisitsCount: number;
  newDealershipVisitsCount: number;
  notes?: string | null;
  monthKey: string;
  submittedAt: Date;
  submittedBy: number;
  isLateSubmission: boolean;
  geoCity?: string | null;
  geoLat?: number | null;
  geoLon?: number | null;
  executive?: {
    id: number;
    name: string | null;
    email: string;
    role: string | null;
  };
}

// Aggregation result types
export interface DailyReportOverview {
  totalSalesUnits: number;
  totalCollectionsINR: number;
  totalDealerMeetings: number;
  totalPlantVisits: number;
  totalNewDealershipVisits: number;
  groupByDay: {
    date: string;
    salesUnits: number;
    collectionsINR: number;
    visitsTotal: number;
  }[];
}

export interface DailyReportAnalytics {
  todaySalesUnits: number;
  todayCollectionsINR: number;
  todayVisitsTotal: number;
  monthlyTotals?: {
    salesUnits: number;
    collectionsINR: number;
    visitsTotal: number;
  };
}
