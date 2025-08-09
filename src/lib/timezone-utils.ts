import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format, parse, startOfDay, endOfDay } from "date-fns";

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Converts a date to IST timezone
 */
export function toIST(date: Date): Date {
  return toZonedTime(date, IST_TIMEZONE);
}

/**
 * Converts an IST date to UTC
 */
export function fromIST(date: Date): Date {
  return fromZonedTime(date, IST_TIMEZONE);
}

/**
 * Gets current date and time in IST
 */
export function nowInIST(): Date {
  return toIST(new Date());
}

/**
 * Gets current date (start of day) in IST
 */
export function todayInIST(): Date {
  return startOfDay(toIST(new Date()));
}

/**
 * Formats a date in IST timezone
 */
export function formatInIST(date: Date, formatStr: string): string {
  return formatInTimeZone(date, IST_TIMEZONE, formatStr);
}

/**
 * Generates month key in format "YYYY-MM" from a date
 */
export function toMonthKey(date: Date): string {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM");
}

/**
 * Checks if a report submission is late based on 21:00 IST cutoff
 * @param reportDate - The business date the report is for
 * @param submittedAtUTC - When the report was actually submitted (defaults to now)
 * @returns true if submitted after 21:00 IST on the report date
 */
export function isLateSubmission(
  reportDate: Date,
  submittedAtUTC: Date = new Date()
): boolean {
  // Convert report date to IST and set cutoff time to 21:00:00
  const reportDateIST = toIST(reportDate);
  const cutoffTimeIST = new Date(reportDateIST);
  cutoffTimeIST.setHours(21, 0, 0, 0); // 21:00:00 IST

  // Convert submitted time to IST
  const submittedAtIST = toIST(submittedAtUTC);

  // Late if submitted after the cutoff time
  return submittedAtIST > cutoffTimeIST;
}

/**
 * Gets the cutoff time (21:00 IST) for a given report date
 */
export function getReportCutoffTime(reportDate: Date): Date {
  const reportDateIST = toIST(reportDate);
  const cutoffTimeIST = new Date(reportDateIST);
  cutoffTimeIST.setHours(21, 0, 0, 0);
  return fromIST(cutoffTimeIST); // Convert back to UTC for storage
}

/**
 * Parses date string and converts to IST
 */
export function parseDateToIST(dateStr: string): Date {
  const date = new Date(dateStr);
  return toIST(date);
}

/**
 * Gets start and end of day in IST for a given date
 */
export function getDayBoundsIST(date: Date): { start: Date; end: Date } {
  const dateIST = toIST(date);
  return {
    start: fromIST(startOfDay(dateIST)),
    end: fromIST(endOfDay(dateIST)),
  };
}

/**
 * Checks if a date is today in IST
 */
export function isToday(date: Date): boolean {
  const today = todayInIST();
  const compareDate = startOfDay(toIST(date));
  return today.getTime() === compareDate.getTime();
}

/**
 * Gets the start of current month in IST
 */
export function getCurrentMonthStartIST(): Date {
  const now = nowInIST();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return fromIST(monthStart);
}

/**
 * Gets the end of current month in IST
 */
export function getCurrentMonthEndIST(): Date {
  const now = nowInIST();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return fromIST(monthEnd);
}

/**
 * Converts month key (YYYY-MM) to date range
 */
export function monthKeyToDateRange(monthKey: string): {
  start: Date;
  end: Date;
} {
  const [year, month] = monthKey.split("-").map(Number);
  const startIST = new Date(year, month - 1, 1); // month is 0-indexed in JS
  const endIST = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

  return {
    start: fromIST(startIST),
    end: fromIST(endIST),
  };
}

/**
 * Gets date range for multiple months
 */
export function getMonthRangeBounds(
  fromMonth: string,
  toMonth: string
): { start: Date; end: Date } {
  const fromRange = monthKeyToDateRange(fromMonth);
  const toRange = monthKeyToDateRange(toMonth);

  return {
    start: fromRange.start,
    end: toRange.end,
  };
}

/**
 * Formats currency in Indian format
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats number in Indian format (for units)
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}
