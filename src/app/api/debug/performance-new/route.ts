import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PerformanceMonitor } from "@/lib/performance-utils";

// GET /api/debug/performance-new - Performance diagnostics (new route)
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
            permission
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

    // 5. Cold Start Detection
    const coldStart = process.env.VERCEL_FUNCTION_TIMEOUT
      ? "likely"
      : "unknown";
    diagnostics.coldStart = coldStart;

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
        "Simple queries are slow (>500ms) - check database indexes and connection"
      );
    }

    if (diagnostics.complexQueries.duration > 2000) {
      diagnostics.recommendations.push(
        "Complex queries are very slow (>2s) - optimize database queries and add caching"
      );
    }

    if (diagnostics.permissionChecks?.totalDuration > 1000) {
      diagnostics.recommendations.push(
        "Permission checks are slow (>1s) - implement permission caching"
      );
    }

    if (diagnostics.totalDuration > 5000) {
      diagnostics.recommendations.push(
        "Total request time is very slow (>5s) - consider using the optimized dashboard API"
      );
    }

    if (coldStart === "likely") {
      diagnostics.recommendations.push(
        "Cold start detected - consider using Vercel Pro for better performance"
      );
    }

    // 9. Bottleneck Analysis
    diagnostics.bottleneck = {
      isDatabase:
        diagnostics.dbConnection.duration > 1000 ||
        diagnostics.simpleQuery.duration > 500,
      isPermissionSystem: diagnostics.permissionChecks?.totalDuration > 1000,
      isVercel:
        diagnostics.totalDuration < 2000 &&
        diagnostics.dbConnection.duration < 500,
      isNetwork: diagnostics.totalDuration > 10000,
    };

    return successResponse(diagnostics);
  } catch (error) {
    PerformanceMonitor.end("total-request");
    console.error("Performance diagnostic error:", error);
    return errorResponse("Failed to run performance diagnostics");
  }
}
