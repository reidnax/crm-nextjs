import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PerformanceMonitor } from "@/lib/performance-utils";

// GET /api/debug/performance-enhanced - Enhanced performance diagnostics
export async function GET() {
  try {
    PerformanceMonitor.start("total-request");

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || "unknown",
      functionTimeout: process.env.VERCEL_FUNCTION_TIMEOUT || "unknown",
    };

    // 1. Database Connection Test
    PerformanceMonitor.start("db-connection");
    try {
      await prisma.$queryRaw`SELECT 1`;
      diagnostics.dbConnection = {
        status: "success",
        duration: PerformanceMonitor.end("db-connection"),
      };
    } catch (error) {
      diagnostics.dbConnection = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: PerformanceMonitor.end("db-connection"),
      };
    }

    // 2. Simple Query Performance
    PerformanceMonitor.start("simple-count");
    try {
      const userCount = await prisma.user.count();
      diagnostics.simpleQuery = {
        status: "success",
        result: userCount,
        duration: PerformanceMonitor.end("simple-count"),
      };
    } catch (error) {
      diagnostics.simpleQuery = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: PerformanceMonitor.end("simple-count"),
      };
    }

    // 3. Complex Query Performance (similar to dashboard)
    PerformanceMonitor.start("complex-queries");
    try {
      const [leadsCount, meetingsCount, tasksCount, notesCount] =
        await Promise.all([
          prisma.lead.count(),
          prisma.meeting.count(),
          prisma.task.count(),
          prisma.note.count(),
        ]);

      diagnostics.complexQueries = {
        status: "success",
        results: {
          leads: leadsCount,
          meetings: meetingsCount,
          tasks: tasksCount,
          notes: notesCount,
        },
        duration: PerformanceMonitor.end("complex-queries"),
      };
    } catch (error) {
      diagnostics.complexQueries = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: PerformanceMonitor.end("complex-queries"),
      };
    }

    // 4. Permission System Performance
    PerformanceMonitor.start("permission-checks");
    try {
      const { PermissionManager } = await import("@/lib/permissions/core");
      const userId = session.user?.id;

      const permissions = [
        "leads.read.all",
        "meetings.read.all",
        "tasks.read.all",
        "notes.read.all",
      ];

      const permissionResults = await Promise.all(
        permissions.map(async (permission) => {
          const start = Date.now();
          const hasPermission = await PermissionManager.hasPermission(
            userId,
            permission as any
          );
          const duration = Date.now() - start;
          return { permission, hasPermission, duration };
        })
      );

      diagnostics.permissionChecks = {
        status: "success",
        results: permissionResults,
        totalDuration: PerformanceMonitor.end("permission-checks"),
      };
    } catch (error) {
      diagnostics.permissionChecks = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: PerformanceMonitor.end("permission-checks"),
      };
    }

    // 5. Dashboard API Performance Comparison
    PerformanceMonitor.start("dashboard-comparison");
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const cookie = `next-auth.session-token=${session.user?.id}`;

      const dashboardTests = [
        {
          name: "regular",
          url: `${baseUrl}/api/dashboard`,
        },
        {
          name: "optimized",
          url: `${baseUrl}/api/dashboard/optimized`,
        },
        {
          name: "ultra-optimized",
          url: `${baseUrl}/api/dashboard/ultra-optimized`,
        },
      ];

      const results = await Promise.all(
        dashboardTests.map(async (test) => {
          const start = Date.now();
          try {
            const response = await fetch(test.url, {
              headers: { Cookie: cookie },
            });
            const data = await response.json();
            const duration = Date.now() - start;

            return {
              name: test.name,
              status: response.status,
              duration,
              success: response.ok,
              dataSize: JSON.stringify(data).length,
              cacheStatus: data.meta?.cacheStatus || "unknown",
            };
          } catch (error) {
            return {
              name: test.name,
              status: "error",
              duration: Date.now() - start,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      diagnostics.dashboardComparison = {
        status: "success",
        results,
        totalDuration: PerformanceMonitor.end("dashboard-comparison"),
      };

      // Performance analysis
      const regular = results.find((r) => r.name === "regular");
      const optimized = results.find((r) => r.name === "optimized");
      const ultra = results.find((r) => r.name === "ultra-optimized");

      if (regular && optimized && ultra) {
        diagnostics.performanceAnalysis = {
          regularVsOptimized:
            regular.duration > 0 && optimized.duration > 0
              ? Math.round(
                  ((regular.duration - optimized.duration) / regular.duration) *
                    100
                )
              : 0,
          regularVsUltra:
            regular.duration > 0 && ultra.duration > 0
              ? Math.round(
                  ((regular.duration - ultra.duration) / regular.duration) * 100
                )
              : 0,
          optimizedVsUltra:
            optimized.duration > 0 && ultra.duration > 0
              ? Math.round(
                  ((optimized.duration - ultra.duration) / optimized.duration) *
                    100
                )
              : 0,
          fastest: [regular, optimized, ultra].reduce((a, b) =>
            a.duration < b.duration ? a : b
          ).name,
        };
      }
    } catch (error) {
      diagnostics.dashboardComparison = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: PerformanceMonitor.end("dashboard-comparison"),
      };
    }

    // 6. Memory Usage
    const memUsage = process.memoryUsage();
    diagnostics.memoryUsage = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    };

    // 7. Total Request Time
    diagnostics.totalDuration = PerformanceMonitor.end("total-request");

    // 8. Performance Recommendations
    diagnostics.recommendations = [];

    if (diagnostics.dbConnection.duration > 1000) {
      diagnostics.recommendations.push(
        "Database connection is slow (>1s) - check database location and connection pool"
      );
    }

    if (diagnostics.simpleQuery.duration > 500) {
      diagnostics.recommendations.push(
        "Simple queries are slow (>500ms) - check database performance and indexes"
      );
    }

    if (diagnostics.complexQueries.duration > 2000) {
      diagnostics.recommendations.push(
        "Complex queries are very slow (>2s) - optimize database queries and add indexes"
      );
    }

    if (diagnostics.permissionChecks.totalDuration > 1000) {
      diagnostics.recommendations.push(
        "Permission checks are slow (>1s) - implement permission caching"
      );
    }

    if (diagnostics.dashboardComparison.results) {
      const fastest = diagnostics.dashboardComparison.results.reduce((a, b) =>
        a.duration < b.duration ? a : b
      );

      if (fastest.name !== "ultra-optimized") {
        diagnostics.recommendations.push(
          `Use ${fastest.name} dashboard API for best performance (${fastest.duration}ms)`
        );
      } else {
        diagnostics.recommendations.push(
          "Ultra-optimized dashboard is performing best - consider implementing caching"
        );
      }
    }

    // 9. Bottleneck Analysis
    diagnostics.bottleneckAnalysis = {
      isDatabase:
        diagnostics.dbConnection.duration > 1000 ||
        diagnostics.simpleQuery.duration > 500,
      isPermission: diagnostics.permissionChecks.totalDuration > 1000,
      isVercel:
        diagnostics.totalDuration < 1000 &&
        diagnostics.dbConnection.duration < 500,
      isNetwork: diagnostics.totalDuration > 5000,
      isMemory: diagnostics.memoryUsage.heapUsed > 100, // >100MB
    };

    return successResponse(diagnostics);
  } catch (error) {
    PerformanceMonitor.end("total-request");
    console.error("Enhanced performance diagnostics error:", error);
    return errorResponse("Internal server error", 500);
  }
}
