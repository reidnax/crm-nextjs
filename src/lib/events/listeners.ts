import { bus } from "./bus";
import type { DailyReportSubmittedPayload } from "./bus";

/**
 * Initialize all event listeners
 * This should be called once when the application starts
 */
export function initializeEventListeners(): void {
  // Daily report submitted listener
  bus.on("dailyReport.submitted", handleDailyReportSubmitted);

  console.log("Event listeners initialized");
}

/**
 * Handle daily report submitted event
 */
async function handleDailyReportSubmitted(
  payload: DailyReportSubmittedPayload
): Promise<void> {
  try {
    console.log("Daily report submitted:", {
      id: payload.id,
      executive: payload.executive?.name || `User ${payload.executiveId}`,
      zone: payload.zone,
      reportDate: payload.reportDate.toISOString().split("T")[0],
      salesUnits: payload.salesUnitsToday,
      collections: payload.collectionsTodayINR,
      totalVisits:
        payload.dealerMeetingsCount +
        payload.plantVisitsCount +
        payload.newDealershipVisitsCount,
      isLate: payload.isLateSubmission,
      location: payload.geoCity || "Not specified",
    });

    // Future: Send webhook to n8n or other automation systems
    // await sendWebhookToN8N(payload);

    // Future: Send notifications to managers
    // await notifyManagers(payload);

    // Future: Update dashboard metrics cache
    // await updateDashboardCache(payload);
  } catch (error) {
    console.error("Error handling daily report submitted event:", error);
  }
}

/**
 * Future: Send webhook to n8n automation system
 */
async function sendWebhookToN8N(
  payload: DailyReportSubmittedPayload
): Promise<void> {
  // Implementation placeholder for n8n webhook
  // const webhookUrl = process.env.N8N_DAILY_REPORT_WEBHOOK_URL;
  // if (webhookUrl) {
  //   await fetch(webhookUrl, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(payload),
  //   });
  // }
}

/**
 * Future: Notify managers of late submissions or other alerts
 */
async function notifyManagers(
  payload: DailyReportSubmittedPayload
): Promise<void> {
  // Implementation placeholder for manager notifications
  // if (payload.isLateSubmission) {
  //   // Send notification to managers about late submission
  // }
}

/**
 * Future: Update cached dashboard metrics
 */
async function updateDashboardCache(
  payload: DailyReportSubmittedPayload
): Promise<void> {
  // Implementation placeholder for cache updates
  // Could update Redis cache or other fast lookup stores
}
