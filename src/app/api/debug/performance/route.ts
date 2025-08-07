import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PerformanceMonitor } from "@/lib/performance-utils";

// GET /api/debug/performance - Performance monitoring endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const test = searchParams.get("test") || "basic";

    PerformanceMonitor.start("debug-total");

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION || "unknown",
    };

    if (test === "database" || test === "all") {
      // Test database connection and query performance
      results.database = await PerformanceMonitor.measureAsync(
        "db-connection",
        async () => {
          const start = Date.now();

          // Simple query test
          const userCount = await prisma.user.count();
          const simpleQueryTime = Date.now() - start;

          // Complex query test
          const complexStart = Date.now();
          const complexQuery = await prisma.lead.findMany({
            take: 10,
            include: {
              assignee: { select: { name: true } },
              creator: { select: { name: true } },
              meetings: { take: 1 },
              tasks: { take: 1 },
              notes: { take: 1 },
            },
          });
          const complexQueryTime = Date.now() - complexStart;

          // Permission query test
          const permissionStart = Date.now();
          const permissions = await prisma.userPermission.findMany({
            where: { userId: session.user.id },
            take: 10,
          });
          const permissionQueryTime = Date.now() - permissionStart;

          return {
            connected: true,
            userCount,
            simpleQueryTime,
            complexQueryTime,
            permissionQueryTime,
            totalRecords: complexQuery.length,
          };
        }
      );
    }

    if (test === "api" || test === "all") {
      // Test API performance
      results.api = await PerformanceMonitor.measureAsync(
        "api-tests",
        async () => {
          const tests = [];

          // Test leads API
          const leadsStart = Date.now();
          try {
            const response = await fetch(
              `${request.url.split("/api")[0]}/api/leads?page=1&pageSize=10`,
              {
                headers: {
                  Cookie: request.headers.get("Cookie") || "",
                },
              }
            );
            const leadsTime = Date.now() - leadsStart;
            tests.push({
              endpoint: "leads",
              time: leadsTime,
              status: response.status,
            });
          } catch (error) {
            tests.push({
              endpoint: "leads",
              error: error instanceof Error ? error.message : "Unknown error",
              time: -1,
            });
          }

          // Test dashboard API
          const dashboardStart = Date.now();
          try {
            const response = await fetch(
              `${request.url.split("/api")[0]}/api/dashboard`,
              {
                headers: {
                  Cookie: request.headers.get("Cookie") || "",
                },
              }
            );
            const dashboardTime = Date.now() - dashboardStart;
            tests.push({
              endpoint: "dashboard",
              time: dashboardTime,
              status: response.status,
            });
          } catch (error) {
            tests.push({
              endpoint: "dashboard",
              error: error instanceof Error ? error.message : "Unknown error",
              time: -1,
            });
          }

          return tests;
        }
      );
    }

    if (test === "permissions" || test === "all") {
      // Test permission system performance
      results.permissions = await PerformanceMonitor.measureAsync(
        "permission-tests",
        async () => {
          const { PermissionManager } = await import("@/lib/permissions/core");
          const { DatabaseOptimizer } = await import("@/lib/performance-utils");

          const userId = session.user.id;
          const testPermissions = [
            "leads.read.all",
            "leads.read.assigned",
            "meetings.read.all",
            "tasks.read.all",
            "notes.read.all",
          ];

          // Test individual permission checks
          const individualStart = Date.now();
          const individualResults = [];
          for (const permission of testPermissions) {
            const permStart = Date.now();
            const hasPermission = await PermissionManager.hasPermission(
              userId,
              permission
            );
            const permTime = Date.now() - permStart;
            individualResults.push({
              permission,
              hasPermission,
              time: permTime,
            });
          }
          const individualTotalTime = Date.now() - individualStart;

          // Test batched permission checks
          const batchStart = Date.now();
          const batchResults = await DatabaseOptimizer.batchPermissionChecks(
            userId,
            testPermissions
          );
          const batchTotalTime = Date.now() - batchStart;

          return {
            individual: {
              results: individualResults,
              totalTime: individualTotalTime,
            },
            batched: {
              results: batchResults,
              totalTime: batchTotalTime,
            },
            improvement: Math.round(
              ((individualTotalTime - batchTotalTime) / individualTotalTime) *
                100
            ),
          };
        }
      );
    }

    if (test === "memory" || test === "all") {
      // Memory usage information
      results.memory = {
        usage: process.memoryUsage(),
        uptime: process.uptime(),
      };
    }

    const totalTime = PerformanceMonitor.end("debug-total");
    results.meta = {
      totalExecutionTime: totalTime,
      testType: test,
    };

    // Performance recommendations
    results.recommendations = generateRecommendations(results);

    return successResponse(results);
  } catch (error) {
    PerformanceMonitor.end("debug-total");
    console.error("Performance debug error:", error);
    return errorResponse(
      "Debug failed: " +
        (error instanceof Error ? error.message : "Unknown error"),
      500
    );
  }
}

function generateRecommendations(results: Record<string, any>): string[] {
  const recommendations = [];

  if (results.database) {
    if (results.database.simpleQueryTime > 100) {
      recommendations.push(
        "Database simple queries are slow (>100ms). Check connection pooling and database location."
      );
    }
    if (results.database.complexQueryTime > 500) {
      recommendations.push(
        "Complex queries are slow (>500ms). Consider adding database indexes and optimizing includes."
      );
    }
    if (results.database.permissionQueryTime > 200) {
      recommendations.push(
        "Permission queries are slow. Implement permission caching."
      );
    }
  }

  if (results.permissions) {
    if (
      results.permissions.individual.totalTime >
      results.permissions.batched.totalTime * 2
    ) {
      recommendations.push(
        "Use batched permission checks for significant performance improvement."
      );
    }
  }

  if (results.api) {
    const slowEndpoints = results.api.filter((test: any) => test.time > 1000);
    if (slowEndpoints.length > 0) {
      recommendations.push(
        `Slow API endpoints detected: ${slowEndpoints
          .map((e: any) => e.endpoint)
          .join(", ")}`
      );
    }
  }

  if (results.memory) {
    const heapUsed = results.memory.usage.heapUsed / 1024 / 1024;
    if (heapUsed > 100) {
      recommendations.push(
        `High memory usage detected (${Math.round(
          heapUsed
        )}MB). Consider memory optimization.`
      );
    }
  }

  if (results.vercel) {
    recommendations.push(
      "Running on Vercel. Ensure DATABASE_URL includes connection pooling parameters."
    );
    if (results.region && results.region !== "iad1") {
      recommendations.push(
        `Running in ${results.region}. Consider using a database in the same region.`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("No major performance issues detected.");
  }

  return recommendations;
}
