import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PerformanceMonitor } from "@/lib/performance-utils";

// GET /api/debug/dashboard-comparison-new - Compare dashboard performance (new route)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || "unknown",
    };

    // Test regular dashboard API
    PerformanceMonitor.start("regular-dashboard");
    try {
      const regularResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/dashboard`,
        {
          headers: {
            Cookie: `next-auth.session-token=${session.user?.id}`,
          },
        }
      );

      const regularData = await regularResponse.json();
      results.regularDashboard = {
        status: regularResponse.status,
        duration: PerformanceMonitor.end("regular-dashboard"),
        success: regularResponse.ok,
        dataSize: JSON.stringify(regularData).length,
      };
    } catch (error) {
      results.regularDashboard = {
        status: "error",
        duration: PerformanceMonitor.end("regular-dashboard"),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test optimized dashboard API
    PerformanceMonitor.start("optimized-dashboard");
    try {
      const optimizedResponse = await fetch(
        `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/dashboard/optimized`,
        {
          headers: {
            Cookie: `next-auth.session-token=${session.user?.id}`,
          },
        }
      );

      const optimizedData = await optimizedResponse.json();
      results.optimizedDashboard = {
        status: optimizedResponse.status,
        duration: PerformanceMonitor.end("optimized-dashboard"),
        success: optimizedResponse.ok,
        dataSize: JSON.stringify(optimizedData).length,
      };
    } catch (error) {
      results.optimizedDashboard = {
        status: "error",
        duration: PerformanceMonitor.end("optimized-dashboard"),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test ultra-optimized dashboard API
    PerformanceMonitor.start("ultra-optimized-dashboard");
    try {
      const ultraOptimizedResponse = await fetch(
        `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/dashboard/ultra-optimized`,
        {
          headers: {
            Cookie: `next-auth.session-token=${session.user?.id}`,
          },
        }
      );

      const ultraOptimizedData = await ultraOptimizedResponse.json();
      results.ultraOptimizedDashboard = {
        status: ultraOptimizedResponse.status,
        duration: PerformanceMonitor.end("ultra-optimized-dashboard"),
        success: ultraOptimizedResponse.ok,
        dataSize: JSON.stringify(ultraOptimizedData).length,
      };
    } catch (error) {
      results.ultraOptimizedDashboard = {
        status: "error",
        duration: PerformanceMonitor.end("ultra-optimized-dashboard"),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Performance analysis - compare all three APIs
    const durations = [
      results.regularDashboard.duration,
      results.optimizedDashboard.duration,
      results.ultraOptimizedDashboard.duration,
    ];
    const fastest = Math.min(...durations);
    const slowest = Math.max(...durations);
    const fastestApi = durations.indexOf(fastest);
    const apiNames = ["Regular", "Optimized", "Ultra-Optimized"];

    results.analysis = {
      fastest: apiNames[fastestApi],
      slowest: apiNames[durations.indexOf(slowest)],
      improvement:
        slowest > 0 ? Math.round(((slowest - fastest) / slowest) * 100) : 0,
      recommendation:
        fastestApi === 0
          ? "Regular dashboard is performing best"
          : fastestApi === 1
          ? "Optimized dashboard provides best performance"
          : "Ultra-optimized dashboard offers the best performance",
      comparison: {
        regularVsOptimized:
          results.regularDashboard.duration > 0 &&
          results.optimizedDashboard.duration > 0
            ? Math.round(
                ((results.regularDashboard.duration -
                  results.optimizedDashboard.duration) /
                  results.regularDashboard.duration) *
                  100
              )
            : 0,
        regularVsUltra:
          results.regularDashboard.duration > 0 &&
          results.ultraOptimizedDashboard.duration > 0
            ? Math.round(
                ((results.regularDashboard.duration -
                  results.ultraOptimizedDashboard.duration) /
                  results.regularDashboard.duration) *
                  100
              )
            : 0,
        optimizedVsUltra:
          results.optimizedDashboard.duration > 0 &&
          results.ultraOptimizedDashboard.duration > 0
            ? Math.round(
                ((results.optimizedDashboard.duration -
                  results.ultraOptimizedDashboard.duration) /
                  results.optimizedDashboard.duration) *
                  100
              )
            : 0,
      },
    };

    // Bottleneck identification
    results.bottleneck = {
      isDatabase:
        results.regularDashboard.duration > 2000 ||
        results.optimizedDashboard.duration > 2000 ||
        results.ultraOptimizedDashboard.duration > 2000,
      isVercel:
        results.regularDashboard.duration < 1000 &&
        results.optimizedDashboard.duration < 1000 &&
        results.ultraOptimizedDashboard.duration < 1000,
      isNetwork: results.regularDashboard.duration > 5000,
    };

    return successResponse(results);
  } catch (error) {
    console.error("Dashboard comparison error:", error);
    return errorResponse("Failed to compare dashboard performance");
  }
}
