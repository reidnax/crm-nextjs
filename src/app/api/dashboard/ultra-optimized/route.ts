import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import {
  DatabaseOptimizer,
  PerformanceMonitor,
  AdvancedCache,
} from "@/lib/performance-utils";

// GET /api/dashboard/ultra-optimized - Ultra-optimized dashboard with advanced caching
export async function GET() {
  try {
    PerformanceMonitor.start("ultra-dashboard-total");

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports virtual users)
    const { userId } = await PerformanceMonitor.measureAsync(
      "get-effective-user",
      async () => {
        return await getEffectiveUserForPermissions(session);
      }
    );

    // Generate cache key based on user and current hour (cache for 1 hour)
    const now = new Date();
    const cacheKey = AdvancedCache.generateKey(
      "ultra-dashboard",
      userId,
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours()
    );

    // Check cache first
    const cached = AdvancedCache.get(cacheKey);
    if (cached) {
      return successResponse({
        ...cached,
        meta: {
          ...cached.meta,
          cacheStatus: "hit",
          executionTime: PerformanceMonitor.end("ultra-dashboard-total"),
        },
      });
    }

    // Batch all permission checks at once
    const allPermissions = [
      "leads.read.all",
      "leads.read.assigned",
      "leads.read.department",
      "meetings.read.all",
      "meetings.read.assigned",
      "meetings.read.department",
      "tasks.read.all",
      "tasks.read.assigned",
      "tasks.read.department",
      "notes.read.all",
      "notes.read.assigned",
      "notes.read.department",
    ];

    const permissions = await PerformanceMonitor.measureAsync(
      "batch-permissions",
      async () => {
        return await DatabaseOptimizer.batchPermissionChecks(
          userId,
          allPermissions
        );
      }
    );

    // Get dashboard data using optimized fetcher
    const data = await PerformanceMonitor.measureAsync(
      "dashboard-data-fetch",
      async () => {
        return await DatabaseOptimizer.getDashboardData(
          userId,
          permissions,
          cacheKey
        );
      }
    );

    const totalTime = PerformanceMonitor.end("ultra-dashboard-total");

    const responseData = {
      ...data,
      meta: {
        executionTime: totalTime,
        cacheStatus: "miss",
        optimization: "ultra",
        memoryUsage: process.memoryUsage(),
      },
    };

    // Cache for 1 hour
    AdvancedCache.set(cacheKey, responseData, 60 * 60 * 1000);

    return successResponse(responseData);
  } catch (error) {
    PerformanceMonitor.end("ultra-dashboard-total");
    console.error("Ultra-optimized dashboard API error:", error);
    return errorResponse("Internal server error", 500);
  }
}
