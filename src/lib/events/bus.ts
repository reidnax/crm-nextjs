import { EventEmitter } from "events";
import type { DailyActivityReport } from "../validations/daily-report";

// Event payload types
export interface DailyReportSubmittedPayload {
  id: string;
  executiveId: number;
  reportDate: Date;
  zone: string;
  salesUnitsToday: number;
  collectionsTodayINR: number;
  dealerMeetingsCount: number;
  plantVisitsCount: number;
  newDealershipVisitsCount: number;
  monthKey: string;
  submittedAt: Date;
  submittedBy: number;
  isLateSubmission: boolean;
  geoCity?: string | null;
  executive?: {
    id: number;
    name: string | null;
    email: string;
    role: string | null;
  };
}

// Event types
export interface EventMap {
  "dailyReport.submitted": [DailyReportSubmittedPayload];
}

// Create a typed event emitter
class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof EventMap>(
    event: K,
    listener: (...args: EventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof EventMap>(
    event: K,
    listener: (...args: EventMap[K]) => void
  ): this {
    return super.once(event, listener);
  }

  off<K extends keyof EventMap>(
    event: K,
    listener: (...args: EventMap[K]) => void
  ): this {
    return super.off(event, listener);
  }
}

// Singleton event bus instance
let eventBus: TypedEventEmitter | null = null;

export function getEventBus(): TypedEventEmitter {
  if (!eventBus) {
    eventBus = new TypedEventEmitter();

    // Set max listeners to prevent warning in development
    eventBus.setMaxListeners(20);

    // Add error handler
    eventBus.on("error", (error) => {
      console.error("Event bus error:", error);
    });
  }

  return eventBus;
}

// Export the singleton instance
export const bus = getEventBus();

// Helper function to emit daily report submitted event
export function emitDailyReportSubmitted(
  payload: DailyReportSubmittedPayload
): void {
  try {
    bus.emit("dailyReport.submitted", payload);
  } catch (error) {
    console.error("Error emitting dailyReport.submitted event:", error);
  }
}

// Helper function to create payload from database record
export function createDailyReportPayload(
  report: DailyActivityReport & {
    executive?: {
      id: number;
      name: string | null;
      email: string;
      role: string | null;
    };
  }
): DailyReportSubmittedPayload {
  return {
    id: report.id,
    executiveId: report.executiveId,
    reportDate: report.reportDate,
    zone: report.zone,
    salesUnitsToday: report.salesUnitsToday,
    collectionsTodayINR: Number(report.collectionsTodayINR),
    dealerMeetingsCount: report.dealerMeetingsCount,
    plantVisitsCount: report.plantVisitsCount,
    newDealershipVisitsCount: report.newDealershipVisitsCount,
    monthKey: report.monthKey,
    submittedAt: report.submittedAt,
    submittedBy: report.submittedBy,
    isLateSubmission: report.isLateSubmission,
    geoCity: report.geoCity,
    executive: report.executive,
  };
}
