import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ConnectionPoolTester } from "@/lib/performance-utils";
import { performance } from "perf_hooks";

interface ConnectionPoolDiagnostics {
  timestamp: string;
  environment: {
    node: string;
    region: string;
    databaseProvider: string;
    connectionPooling: string;
  };
  tests: {
    connectionPoolLoad: {
      name: string;
      duration: number;
      status: "success" | "error" | "warning";
      details?: any;
      error?: string;
      recommendations?: string[];
    };
    connectionPoolStatus: {
      name: string;
      duration: number;
      status: "success" | "error" | "warning";
      details?: any;
      error?: string;
    };
    sustainedLoad: {
      name: string;
      duration: number;
      status: "success" | "error" | "warning";
      details?: any;
      error?: string;
      recommendations?: string[];
    };
  };
  analysis: {
    overallStatus: "excellent" | "good" | "warning" | "critical";
    primaryIssues: string[];
    recommendations: string[];
    performanceScore: number;
  };
  meta: {
    executionTime: number;
    testsConducted: number;
    version: string;
    cacheBuster: number;
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    console.log("🔍 Starting dedicated connection pool diagnostics...");

    // Add cache-busting timestamp to prevent Vercel caching
    const cacheBuster = Date.now();

    // Environment detection - Neon.tech specific
    const databaseUrl = process.env.DATABASE_URL || "";
    const urlParams = new URLSearchParams(databaseUrl.split("?")[1] || "");

    // Neon.tech uses -pooler endpoint for connection pooling, not pgbouncer parameter
    const isNeonPooled =
      databaseUrl.includes("-pooler.") && databaseUrl.includes("neon.tech");
    const hasLegacyPgBouncer =
      urlParams.has("pgbouncer") || databaseUrl.includes("pgbouncer=true");

    // Extract endpoint information for analysis
    const endpointMatch = databaseUrl.match(/@([^/]+)/);
    const endpoint = endpointMatch ? endpointMatch[1] : "";
    const isNeonDatabase = endpoint.includes("neon.tech");
    const isDirectConnection = isNeonDatabase && !endpoint.includes("-pooler.");

    // Determine actual pooling status
    const actualPoolingStatus = isNeonPooled
      ? "enabled"
      : isDirectConnection
      ? "disabled (using direct connection)"
      : hasLegacyPgBouncer
      ? "enabled (legacy)"
      : "disabled";

    const diagnostics: ConnectionPoolDiagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        region: process.env.VERCEL_REGION || "local",
        databaseProvider: "Neon.tech PostgreSQL",
        connectionPooling: actualPoolingStatus,
      },
      tests: {
        connectionPoolLoad: {
          name: "Connection Pool Load Test",
          duration: 0,
          status: "success",
        },
        connectionPoolStatus: {
          name: "Connection Pool Status",
          duration: 0,
          status: "success",
        },
        sustainedLoad: {
          name: "Sustained Load Test",
          duration: 0,
          status: "success",
        },
      },
      analysis: {
        overallStatus: "good",
        primaryIssues: [],
        recommendations: [],
        performanceScore: 100,
      },
      meta: {
        executionTime: 0,
        testsConducted: 3,
        version: "1.0",
        cacheBuster: cacheBuster,
      },
    };

    // Test 1: Connection Pool Load Test (reduced load for production)
    console.log("🚀 Running connection pool load test...");
    const loadTestStart = performance.now();
    try {
      const loadTestResults = await ConnectionPoolTester.testConnectionPoolLoad(
        10
      ); // Reduced from 15
      diagnostics.tests.connectionPoolLoad.duration =
        performance.now() - loadTestStart;
      diagnostics.tests.connectionPoolLoad.status =
        loadTestResults.connectionFailures > 0
          ? "error"
          : loadTestResults.avgConnectionTime > 300
          ? "warning"
          : "success";

      diagnostics.tests.connectionPoolLoad.details = {
        avgConnectionTime: loadTestResults.avgConnectionTime,
        maxConnectionTime: loadTestResults.maxConnectionTime,
        minConnectionTime: loadTestResults.minConnectionTime,
        connectionFailures: loadTestResults.connectionFailures,
        recommendedLimit: loadTestResults.recommendedLimit,
        concurrentConnections: loadTestResults.concurrentConnections,
        queueTime: loadTestResults.queueTime,
        throughput: loadTestResults.throughput,
      };

      if (loadTestResults.connectionFailures > 0) {
        diagnostics.tests.connectionPoolLoad.error = `${loadTestResults.connectionFailures} connection failures detected`;
        diagnostics.analysis.primaryIssues.push(
          "Connection pool failures detected"
        );
      }

      if (loadTestResults.recommendedLimit > 10) {
        diagnostics.tests.connectionPoolLoad.recommendations = [
          `Consider increasing connection_limit to ${loadTestResults.recommendedLimit}`,
          `Current avg connection time: ${loadTestResults.avgConnectionTime}ms`,
        ];
        diagnostics.analysis.recommendations.push(
          `Increase connection_limit to ${loadTestResults.recommendedLimit} for better performance`
        );
      }

      console.log(
        `✅ Load test completed: ${loadTestResults.avgConnectionTime}ms avg`
      );
    } catch (error) {
      console.error("❌ Load test failed:", error);
      diagnostics.tests.connectionPoolLoad.status = "error";
      diagnostics.tests.connectionPoolLoad.error =
        error instanceof Error ? error.message : "Unknown error";
      diagnostics.tests.connectionPoolLoad.duration =
        performance.now() - loadTestStart;
      diagnostics.analysis.primaryIssues.push(
        "Connection pool load test failed"
      );
    }

    // Test 2: Connection Pool Status
    console.log("📊 Checking connection pool status...");
    const statusTestStart = performance.now();
    try {
      const poolStatus = await ConnectionPoolTester.getConnectionPoolStatus();
      diagnostics.tests.connectionPoolStatus.duration =
        performance.now() - statusTestStart;
      diagnostics.tests.connectionPoolStatus.status =
        poolStatus.connectionPoolUtilization > 80 ? "warning" : "success";

      diagnostics.tests.connectionPoolStatus.details = {
        activeConnections: poolStatus.activeConnections,
        maxConnections: poolStatus.maxConnections,
        utilization: poolStatus.connectionPoolUtilization,
        databaseName: poolStatus.databaseName,
        serverVersion: poolStatus.serverVersion,
      };

      if (poolStatus.connectionPoolUtilization > 80) {
        diagnostics.analysis.primaryIssues.push(
          "High connection pool utilization (>80%)"
        );
        diagnostics.analysis.recommendations.push(
          "Monitor connection pool usage and consider scaling"
        );
      }

      console.log(
        `✅ Pool status: ${poolStatus.activeConnections}/${poolStatus.maxConnections} connections`
      );
    } catch (error) {
      console.error("❌ Pool status failed:", error);
      diagnostics.tests.connectionPoolStatus.status = "error";
      diagnostics.tests.connectionPoolStatus.error =
        error instanceof Error ? error.message : "Unknown error";
      diagnostics.tests.connectionPoolStatus.duration =
        performance.now() - statusTestStart;
      diagnostics.analysis.primaryIssues.push(
        "Connection pool status check failed"
      );
    }

    // Test 3: Sustained Load Test (reduced duration)
    console.log("⚡ Running sustained load test...");
    const sustainedTestStart = performance.now();
    try {
      const sustainedResults = await ConnectionPoolTester.testSustainedLoad(
        3000,
        2
      ); // Reduced from 5s to 3s
      diagnostics.tests.sustainedLoad.duration =
        performance.now() - sustainedTestStart;
      diagnostics.tests.sustainedLoad.status =
        sustainedResults.failedQueries > 0
          ? "error"
          : sustainedResults.avgResponseTime > 200
          ? "warning"
          : "success";

      diagnostics.tests.sustainedLoad.details = {
        totalQueries: sustainedResults.totalQueries,
        successfulQueries: sustainedResults.successfulQueries,
        failedQueries: sustainedResults.failedQueries,
        avgResponseTime: sustainedResults.avgResponseTime,
        maxResponseTime: sustainedResults.maxResponseTime,
        queriesPerSecond: sustainedResults.queriesPerSecond,
      };

      if (sustainedResults.failedQueries > 0) {
        diagnostics.tests.sustainedLoad.error = `${sustainedResults.failedQueries} queries failed during sustained load test`;
        diagnostics.analysis.primaryIssues.push("Sustained load test failures");
      }

      if (sustainedResults.queriesPerSecond < 5) {
        diagnostics.tests.sustainedLoad.recommendations = [
          "Low query throughput detected",
          "Consider optimizing database configuration or upgrading resources",
        ];
        diagnostics.analysis.recommendations.push(
          "Consider database performance optimization"
        );
      }

      console.log(
        `✅ Sustained test: ${sustainedResults.queriesPerSecond} QPS`
      );
    } catch (error) {
      console.error("❌ Sustained test failed:", error);
      diagnostics.tests.sustainedLoad.status = "error";
      diagnostics.tests.sustainedLoad.error =
        error instanceof Error ? error.message : "Unknown error";
      diagnostics.tests.sustainedLoad.duration =
        performance.now() - sustainedTestStart;
      diagnostics.analysis.primaryIssues.push("Sustained load test failed");
    }

    // Overall analysis
    const hasErrors = Object.values(diagnostics.tests).some(
      (test) => test.status === "error"
    );
    const hasWarnings = Object.values(diagnostics.tests).some(
      (test) => test.status === "warning"
    );

    if (hasErrors) {
      diagnostics.analysis.overallStatus = "critical";
      diagnostics.analysis.performanceScore = 25;
    } else if (hasWarnings) {
      diagnostics.analysis.overallStatus = "warning";
      diagnostics.analysis.performanceScore = 60;
    } else if (isDirectConnection) {
      diagnostics.analysis.overallStatus = "critical";
      diagnostics.analysis.performanceScore = 30;
      diagnostics.analysis.primaryIssues.push(
        "Using direct Neon connection instead of pooled connection"
      );
      diagnostics.analysis.recommendations.push(
        "CRITICAL: Switch to Neon pooled connection by adding '-pooler' to your endpoint"
      );
      diagnostics.analysis.recommendations.push(
        `Current: ${endpoint.split(".")[0]}.neon.tech`
      );
      diagnostics.analysis.recommendations.push(
        `Required: ${endpoint.split(".")[0]}-pooler.neon.tech`
      );
    } else if (!isNeonPooled && !hasLegacyPgBouncer) {
      diagnostics.analysis.overallStatus = "warning";
      diagnostics.analysis.performanceScore = 70;
      diagnostics.analysis.primaryIssues.push(
        "Connection pooling not detected"
      );
      diagnostics.analysis.recommendations.push(
        "Enable connection pooling for better performance"
      );
    } else if (hasLegacyPgBouncer && !isNeonPooled) {
      diagnostics.analysis.overallStatus = "warning";
      diagnostics.analysis.performanceScore = 75;
      diagnostics.analysis.primaryIssues.push(
        "Using legacy pgbouncer parameter instead of Neon pooling"
      );
      diagnostics.analysis.recommendations.push(
        "Switch to Neon's native pooling by using -pooler endpoint"
      );
    } else {
      diagnostics.analysis.overallStatus = "excellent";
      diagnostics.analysis.performanceScore = 95;
    }

    // Add performance-based recommendations
    const loadTestDetails = diagnostics.tests.connectionPoolLoad.details;
    if (loadTestDetails) {
      if (loadTestDetails.avgConnectionTime > 500 && isDirectConnection) {
        diagnostics.analysis.recommendations.push(
          "High connection latency detected - this confirms you need to switch to pooled connection"
        );
      }
      if (loadTestDetails.recommendedLimit > 10) {
        diagnostics.analysis.recommendations.push(
          `Consider optimizing for ${loadTestDetails.recommendedLimit} concurrent connections`
        );
      }
    }

    diagnostics.meta.executionTime = Date.now() - startTime;

    console.log(
      `🎉 Connection pool diagnostics completed in ${diagnostics.meta.executionTime}ms`
    );

    // Create response with cache-busting headers
    const response = successResponse(diagnostics);

    // Add cache-busting headers to prevent Vercel caching
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Cache-Buster", cacheBuster.toString());

    return response;
  } catch (error) {
    console.error("❌ Connection pool diagnostics error:", error);
    return errorResponse(
      `Connection pool diagnostics failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
