/**
 * Authentication System Health Check Endpoint
 * Provides monitoring data for the auth system
 */

import { authUtils } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const healthStatus = await authUtils.healthCheck();
    const cacheStats = authUtils.getCacheStats();

    return successResponse({
      auth: healthStatus,
      cache: {
        impersonation: cacheStats,
        performance: {
          utilizationPercent: (cacheStats.size / cacheStats.maxSize) * 100,
          isHealthy: cacheStats.size < cacheStats.maxSize * 0.8, // Under 80% is healthy
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auth health check failed:", error);
    return errorResponse("Health check failed", 500);
  }
}
