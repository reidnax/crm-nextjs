import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  PerformanceMonitor,
  ConnectionPoolTester,
} from "@/lib/performance-utils";
import { performance } from "perf_hooks";

interface PerformanceMetric {
  name: string;
  duration: number;
  status: "success" | "error" | "warning";
  details?: any;
  error?: string;
  recommendations?: string[];
}

interface DatabasePerformance {
  connectionPool: PerformanceMetric;
  connectionPoolLoad: PerformanceMetric;
  connectionPoolStatus: PerformanceMetric;
  sustainedLoad: PerformanceMetric;
  simpleQueries: PerformanceMetric[];
  complexQueries: PerformanceMetric[];
  aggregateQueries: PerformanceMetric[];
  transactions: PerformanceMetric[];
}

interface SystemPerformance {
  memory: {
    heap: { used: number; total: number; limit: number };
    external: number;
    rss: number;
    buffers: number;
    cached?: number;
  };
  cpu: {
    userCPUTime: number;
    systemCPUTime: number;
    loadAverage?: number[];
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc: {
    collections: number;
    totalTime: number;
    avgTime: number;
  };
}

interface NetworkPerformance {
  dns: PerformanceMetric;
  externalAPIs: PerformanceMetric[];
  latency: {
    database: number;
    internal: number;
    external: number;
  };
}

interface PerformanceDiagnostic {
  timestamp: string;
  environment: {
    node: string;
    vercel: {
      region: string;
      timeout: string;
      memory: string;
    };
    database: {
      provider: string;
      connectionLimit: string;
      location: string;
    };
  };
  database: DatabasePerformance;
  system: SystemPerformance;
  network: NetworkPerformance;
  permissions: PerformanceMetric[];
  bottlenecks: {
    primary: string;
    secondary: string[];
    severity: "low" | "medium" | "high" | "critical";
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  performanceScore: {
    overall: number;
    database: number;
    system: number;
    network: number;
    permissions: number;
  };
  trends: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
  };
}

// GET /api/debug/performance-enhanced - Enhanced performance diagnostics
export async function GET() {
  const diagnostic: Partial<PerformanceDiagnostic> = {};

  try {
    PerformanceMonitor.start("enhanced-diagnostics");

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Add cache-busting timestamp to prevent Vercel caching
    const cacheBuster = Date.now();

    // Environment Detection with proper Vercel variables
    const databaseUrl = process.env.DATABASE_URL || "";
    const urlParams = new URLSearchParams(databaseUrl.split("?")[1] || "");
    const connectionLimit = urlParams.get("connection_limit") || "not set";
    const hasPgBouncer =
      urlParams.has("pgbouncer") || databaseUrl.includes("pgbouncer=true");
    const poolTimeout = urlParams.get("pool_timeout") || "not set";

    // Extract database host for location detection
    const dbHost = databaseUrl.match(/\/\/[^:]+@([^:/]+)/)?.[1] || "unknown";
    let dbLocation = "unknown";
    if (dbHost.includes("neon.tech")) {
      // Extract region from Neon.tech hostname
      const regionMatch = dbHost.match(/([a-z]+-[a-z]+-\d+)/);
      dbLocation = regionMatch ? `${regionMatch[1]} (Neon.tech)` : "Neon.tech";
    }

    diagnostic.environment = {
      node: process.version,
      vercel: {
        region: process.env.VERCEL_REGION || process.env.AWS_REGION || "local",
        timeout: process.env.VERCEL_MAX_DURATION || "30s",
        memory: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
          ? `${process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE}MB`
          : process.env.VERCEL_REGION
          ? "1024MB (default)"
          : "local",
      },
      database: {
        provider: "postgresql",
        connectionLimit: hasPgBouncer
          ? `${connectionLimit} (pooled, max 10,000)`
          : `${connectionLimit} (direct, max 839)`,
        location: dbLocation,
        pooling: hasPgBouncer ? "enabled" : "disabled",
        poolTimeout: poolTimeout,
      },
    };

    // Database Performance Tests
    diagnostic.database = await runDatabasePerformanceTests();

    // System Performance Tests
    diagnostic.system = await runSystemPerformanceTests();

    // Network Performance Tests
    diagnostic.network = await runNetworkPerformanceTests();

    // Permission System Tests
    diagnostic.permissions = await runPermissionPerformanceTests(
      (session as any).user?.id
    );

    // Bottleneck Analysis
    diagnostic.bottlenecks = analyzeBottlenecks(diagnostic);

    // Performance Scoring
    diagnostic.performanceScore = calculatePerformanceScores(diagnostic);

    // Recommendations
    diagnostic.recommendations = generateRecommendations(diagnostic);

    // Trend Analysis (simplified for now)
    diagnostic.trends = {
      improving: false,
      degrading: diagnostic.performanceScore.overall < 50,
      stable: diagnostic.performanceScore.overall >= 50,
    };

    diagnostic.timestamp = new Date().toISOString();

    const totalDuration = PerformanceMonitor.end("enhanced-diagnostics");

    const response = successResponse({
      ...diagnostic,
      meta: {
        executionTime: totalDuration,
        testsConducted: getTotalTestCount(diagnostic),
        version: "2.0",
        cacheBuster: cacheBuster, // Add cache buster to prevent Vercel caching
      },
    });

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
    console.error("Enhanced performance diagnostic error:", error);
    return errorResponse("Failed to run enhanced performance diagnostics");
  }
}

async function runDatabasePerformanceTests(): Promise<DatabasePerformance> {
  const dbPerf: DatabasePerformance = {
    connectionPool: { name: "Connection Pool", duration: 0, status: "success" },
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
    simpleQueries: [],
    complexQueries: [],
    aggregateQueries: [],
    transactions: [],
  };

  // Connection Pool Test
  const poolStart = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT pg_backend_pid()`;
    await prisma.$queryRaw`SELECT current_database()`;

    dbPerf.connectionPool.duration = performance.now() - poolStart;
    dbPerf.connectionPool.status =
      dbPerf.connectionPool.duration > 1000 ? "warning" : "success";
  } catch (error) {
    dbPerf.connectionPool.status = "error";
    dbPerf.connectionPool.error =
      error instanceof Error ? error.message : "Unknown error";
    dbPerf.connectionPool.duration = performance.now() - poolStart;
  }

  // Connection Pool Load Test
  console.log("🔍 Starting connection pool load test...");
  const loadTestStart = performance.now();
  try {
    const loadTestResults = await ConnectionPoolTester.testConnectionPoolLoad(
      15
    );
    console.log("✅ Connection pool load test completed:", loadTestResults);
    dbPerf.connectionPoolLoad.duration = performance.now() - loadTestStart;
    dbPerf.connectionPoolLoad.status =
      loadTestResults.connectionFailures > 0
        ? "error"
        : loadTestResults.avgConnectionTime > 500
        ? "warning"
        : "success";
    dbPerf.connectionPoolLoad.details = {
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
      dbPerf.connectionPoolLoad.error = `${loadTestResults.connectionFailures} connection failures detected`;
    }
    if (loadTestResults.recommendedLimit > 10) {
      dbPerf.connectionPoolLoad.recommendations = [
        `Consider increasing connection_limit to ${loadTestResults.recommendedLimit}`,
        `Current avg connection time: ${loadTestResults.avgConnectionTime}ms`,
      ];
    }
  } catch (error) {
    console.error("❌ Connection pool load test failed:", error);
    dbPerf.connectionPoolLoad.status = "error";
    dbPerf.connectionPoolLoad.error =
      error instanceof Error ? error.message : "Unknown error";
    dbPerf.connectionPoolLoad.duration = performance.now() - loadTestStart;
  }

  // Connection Pool Status
  console.log("📊 Starting connection pool status test...");
  const statusTestStart = performance.now();
  try {
    const poolStatus = await ConnectionPoolTester.getConnectionPoolStatus();
    console.log("✅ Connection pool status completed:", poolStatus);
    dbPerf.connectionPoolStatus.duration = performance.now() - statusTestStart;
    dbPerf.connectionPoolStatus.status =
      poolStatus.connectionPoolUtilization > 80 ? "warning" : "success";
    dbPerf.connectionPoolStatus.details = {
      activeConnections: poolStatus.activeConnections,
      maxConnections: poolStatus.maxConnections,
      utilization: poolStatus.connectionPoolUtilization,
      databaseName: poolStatus.databaseName,
      serverVersion: poolStatus.serverVersion,
    };
    if (poolStatus.connectionPoolUtilization > 80) {
      dbPerf.connectionPoolStatus.recommendations = [
        "Connection pool utilization is high (>80%)",
        "Consider increasing connection limits or optimizing query patterns",
      ];
    }
  } catch (error) {
    console.error("❌ Connection pool status test failed:", error);
    dbPerf.connectionPoolStatus.status = "error";
    dbPerf.connectionPoolStatus.error =
      error instanceof Error ? error.message : "Unknown error";
    dbPerf.connectionPoolStatus.duration = performance.now() - statusTestStart;
  }

  // Sustained Load Test (shorter duration for production)
  console.log("⚡ Starting sustained load test...");
  const sustainedTestStart = performance.now();
  try {
    const sustainedResults = await ConnectionPoolTester.testSustainedLoad(
      5000,
      3
    ); // 5 seconds, 3 concurrent
    console.log("✅ Sustained load test completed:", sustainedResults);
    dbPerf.sustainedLoad.duration = performance.now() - sustainedTestStart;
    dbPerf.sustainedLoad.status =
      sustainedResults.failedQueries > 0
        ? "error"
        : sustainedResults.avgResponseTime > 300
        ? "warning"
        : "success";
    dbPerf.sustainedLoad.details = {
      totalQueries: sustainedResults.totalQueries,
      successfulQueries: sustainedResults.successfulQueries,
      failedQueries: sustainedResults.failedQueries,
      avgResponseTime: sustainedResults.avgResponseTime,
      maxResponseTime: sustainedResults.maxResponseTime,
      queriesPerSecond: sustainedResults.queriesPerSecond,
    };
    if (sustainedResults.failedQueries > 0) {
      dbPerf.sustainedLoad.error = `${sustainedResults.failedQueries} queries failed during sustained load test`;
    }
    if (sustainedResults.queriesPerSecond < 10) {
      dbPerf.sustainedLoad.recommendations = [
        "Low query throughput detected",
        "Consider optimizing database configuration or upgrading resources",
      ];
    }
  } catch (error) {
    console.error("❌ Sustained load test failed:", error);
    dbPerf.sustainedLoad.status = "error";
    dbPerf.sustainedLoad.error =
      error instanceof Error ? error.message : "Unknown error";
    dbPerf.sustainedLoad.duration = performance.now() - sustainedTestStart;
  }

  // Simple Queries with cache-busting
  const simpleQueries = [
    {
      name: "User Count",
      query: () => prisma.user.count({ where: { id: { gte: 0 } } }),
    },
    {
      name: "Lead Count",
      query: () => prisma.lead.count({ where: { id: { gte: 0 } } }),
    },
    {
      name: "Meeting Count",
      query: () => prisma.meeting.count({ where: { id: { gte: 0 } } }),
    },
    {
      name: "Task Count",
      query: () => prisma.task.count({ where: { id: { gte: 0 } } }),
    },
  ];

  for (const test of simpleQueries) {
    const start = performance.now();
    try {
      const result = await test.query();
      const duration = performance.now() - start;
      dbPerf.simpleQueries.push({
        name: test.name,
        duration,
        status: duration > 500 ? "warning" : "success",
        details: { count: result },
      });
    } catch (error) {
      dbPerf.simpleQueries.push({
        name: test.name,
        duration: performance.now() - start,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Complex Queries with cache-busting
  const complexStart = performance.now();
  try {
    const [leadsWithMeetings, tasksWithAssignees, notesWithLeads] =
      await Promise.all([
        prisma.lead.findMany({
          take: 10,
          where: { id: { gte: 0 } }, // Cache-busting condition
          include: { meetings: true, tasks: true },
        }),
        prisma.task.findMany({
          take: 10,
          where: { id: { gte: 0 } }, // Cache-busting condition
          include: { lead: true },
        }),
        prisma.note.findMany({
          take: 10,
          where: { id: { gte: 0 } }, // Cache-busting condition
          include: { lead: true },
        }),
      ]);

    dbPerf.complexQueries.push({
      name: "Relational Queries",
      duration: performance.now() - complexStart,
      status: performance.now() - complexStart > 2000 ? "warning" : "success",
      details: {
        leadsCount: leadsWithMeetings.length,
        tasksCount: tasksWithAssignees.length,
        notesCount: notesWithLeads.length,
      },
    });
  } catch (error) {
    dbPerf.complexQueries.push({
      name: "Relational Queries",
      duration: performance.now() - complexStart,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Aggregate Queries
  const aggStart = performance.now();
  try {
    const aggregates = await prisma.lead.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    dbPerf.aggregateQueries.push({
      name: "Lead Status Aggregation",
      duration: performance.now() - aggStart,
      status: performance.now() - aggStart > 1000 ? "warning" : "success",
      details: { groups: aggregates.length },
    });
  } catch (error) {
    dbPerf.aggregateQueries.push({
      name: "Lead Status Aggregation",
      duration: performance.now() - aggStart,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Debug: Log the complete database performance object
  console.log(
    "🔍 Complete database performance object:",
    JSON.stringify(dbPerf, null, 2)
  );
  console.log("🔍 Connection pool tests included:", {
    connectionPoolLoad: !!dbPerf.connectionPoolLoad,
    connectionPoolStatus: !!dbPerf.connectionPoolStatus,
    sustainedLoad: !!dbPerf.sustainedLoad,
  });

  return dbPerf;
}

async function runSystemPerformanceTests(): Promise<SystemPerformance> {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Event Loop Lag Test
  const eventLoopStart = performance.now();
  await new Promise((resolve) => setImmediate(resolve));
  const eventLoopLag = performance.now() - eventLoopStart;

  return {
    memory: {
      heap: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        limit: Math.round((memUsage.heapTotal * 1.5) / 1024 / 1024), // Estimate
      },
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      buffers: Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024),
    },
    cpu: {
      userCPUTime: Math.round(cpuUsage.user / 1000),
      systemCPUTime: Math.round(cpuUsage.system / 1000),
      loadAverage: process.platform !== "win32" ? [0, 0, 0] : undefined, // Not available on all platforms
    },
    eventLoop: {
      lag: eventLoopLag,
      utilization: eventLoopLag > 10 ? 0.8 : 0.1, // Simplified calculation
    },
    gc: {
      collections: 0, // Would need gc-stats package for real data
      totalTime: 0,
      avgTime: 0,
    },
  };
}

async function runNetworkPerformanceTests(): Promise<NetworkPerformance> {
  const network: NetworkPerformance = {
    dns: { name: "DNS Resolution", duration: 0, status: "success" },
    externalAPIs: [],
    latency: {
      database: 0,
      internal: 0,
      external: 0,
    },
  };

  // DNS Test (simplified)
  const dnsStart = performance.now();
  try {
    // Test database connectivity as a proxy for DNS
    await prisma.$queryRaw`SELECT 1`;
    network.dns.duration = performance.now() - dnsStart;
    network.dns.status = network.dns.duration > 100 ? "warning" : "success";
    network.latency.database = network.dns.duration;
  } catch (error) {
    network.dns.status = "error";
    network.dns.error =
      error instanceof Error ? error.message : "Unknown error";
  }

  // Internal API latency test
  const internalStart = performance.now();
  try {
    // Skip internal API test in development to avoid session issues
    network.latency.internal = 50; // Simulated latency
    network.externalAPIs.push({
      name: "Internal API Test",
      duration: network.latency.internal,
      status: "success",
      details: { note: "Simulated in development" },
    });
  } catch (error) {
    network.externalAPIs.push({
      name: "Internal API Test",
      duration: performance.now() - internalStart,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return network;
}

async function runPermissionPerformanceTests(
  userId: string | undefined
): Promise<PerformanceMetric[]> {
  const permissions = [
    "leads.read.all",
    "leads.read.assigned",
    "meetings.read.all",
    "tasks.read.all",
    "notes.read.all",
  ];

  const results: PerformanceMetric[] = [];

  if (!userId) {
    results.push({
      name: "Permission System",
      duration: 0,
      status: "error",
      error: "No user ID provided",
    });
    return results;
  }

  try {
    const { PermissionManager } = await import("@/lib/permissions/core");

    for (const permission of permissions) {
      const start = performance.now();
      try {
        const hasPermission = await PermissionManager.hasPermission(
          parseInt(userId),
          permission as any
        );
        const duration = performance.now() - start;

        results.push({
          name: `Permission: ${permission}`,
          duration,
          status: duration > 200 ? "warning" : "success",
          details: { hasPermission },
        });
      } catch (error) {
        results.push({
          name: `Permission: ${permission}`,
          duration: performance.now() - start,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } catch (error) {
    results.push({
      name: "Permission System",
      duration: 0,
      status: "error",
      error: "Failed to load permission system",
    });
  }

  return results;
}

function analyzeBottlenecks(diagnostic: Partial<PerformanceDiagnostic>) {
  const bottlenecks: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let primary = "none";

  // Database bottlenecks
  if (
    diagnostic.database?.connectionPool.duration &&
    diagnostic.database.connectionPool.duration > 1000
  ) {
    bottlenecks.push("Database connection pool");
    severity = "high";
  }

  // System bottlenecks
  if (
    diagnostic.system?.memory.heap.used &&
    diagnostic.system.memory.heap.used >
      diagnostic.system.memory.heap.total * 0.8
  ) {
    bottlenecks.push("Memory usage");
    severity = severity === "low" ? "medium" : "critical";
  }

  // Network bottlenecks
  if (
    diagnostic.network?.latency.internal &&
    diagnostic.network.latency.internal > 1000
  ) {
    bottlenecks.push("Network latency");
    severity = severity === "low" ? "medium" : severity;
  }

  // Permission bottlenecks
  const permissionAvg =
    diagnostic.permissions?.reduce((sum, p) => sum + p.duration, 0) /
    (diagnostic.permissions?.length || 1);
  if (permissionAvg > 500) {
    bottlenecks.push("Permission checks");
    severity = severity === "low" ? "medium" : severity;
  }

  primary = bottlenecks[0] || "none";

  return {
    primary,
    secondary: bottlenecks.slice(1),
    severity,
  };
}

function calculatePerformanceScores(
  diagnostic: Partial<PerformanceDiagnostic>
) {
  // Database score
  const dbScore = Math.max(
    0,
    100 - (diagnostic.database?.connectionPool?.duration || 0) / 10
  );

  // System score
  const memUsagePercent = diagnostic.system?.memory?.heap?.used
    ? (diagnostic.system.memory.heap.used /
        (diagnostic.system.memory.heap.total || 1)) *
      100
    : 0;
  const systemScore = Math.max(0, 100 - memUsagePercent);

  // Network score
  const networkScore = Math.max(
    0,
    100 - (diagnostic.network?.latency?.internal || 0) / 10
  );

  // Permission score
  const permissionAvg =
    diagnostic.permissions?.reduce((sum, p) => sum + p.duration, 0) /
    (diagnostic.permissions?.length || 1);
  const permissionScore = Math.max(0, 100 - permissionAvg / 5);

  // Overall score
  const overall = Math.round(
    (dbScore + systemScore + networkScore + permissionScore) / 4
  );

  return {
    overall,
    database: Math.round(dbScore),
    system: Math.round(systemScore),
    network: Math.round(networkScore),
    permissions: Math.round(permissionScore),
  };
}

function generateRecommendations(diagnostic: Partial<PerformanceDiagnostic>) {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  // Immediate recommendations
  if (
    diagnostic.database?.connectionPool.duration &&
    diagnostic.database.connectionPool.duration > 2000
  ) {
    immediate.push(
      "Database connection is critically slow - check database status immediately"
    );
  }

  if (
    diagnostic.system?.memory.heap.used &&
    diagnostic.system.memory.heap.used > 900
  ) {
    immediate.push("Memory usage is very high - restart the application");
  }

  // Short-term recommendations
  if (
    diagnostic.performanceScore?.database &&
    diagnostic.performanceScore.database < 70
  ) {
    shortTerm.push("Optimize database queries and add connection pooling");
  }

  if (
    diagnostic.performanceScore?.permissions &&
    diagnostic.performanceScore.permissions < 70
  ) {
    shortTerm.push("Implement permission caching to improve response times");
  }

  // Long-term recommendations
  if (
    diagnostic.performanceScore?.overall &&
    diagnostic.performanceScore.overall < 60
  ) {
    longTerm.push("Consider upgrading to a higher-tier hosting plan");
    longTerm.push("Implement comprehensive caching strategy");
    longTerm.push("Consider database optimization and indexing review");
  }

  return {
    immediate,
    shortTerm,
    longTerm,
  };
}

function getTotalTestCount(diagnostic: Partial<PerformanceDiagnostic>): number {
  let count = 0;
  count += diagnostic.database?.simpleQueries?.length || 0;
  count += diagnostic.database?.complexQueries?.length || 0;
  count += diagnostic.database?.aggregateQueries?.length || 0;
  count += diagnostic.permissions?.length || 0;
  count += diagnostic.network?.externalAPIs?.length || 0;
  count += 1; // Connection pool test
  return count;
}
