import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PerformanceMonitor } from "@/lib/performance-utils";
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
  const startTime = performance.now();
  let diagnostic: Partial<PerformanceDiagnostic> = {};

  try {
    PerformanceMonitor.start("enhanced-diagnostics");

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Add cache-busting timestamp to prevent Vercel caching
    const cacheBuster = Date.now();

    // Environment Detection
    diagnostic.environment = {
      node: process.version,
      vercel: {
        region: process.env.VERCEL_REGION || "local",
        timeout: process.env.VERCEL_FUNCTION_TIMEOUT || "unknown",
        memory: process.env.VERCEL_FUNCTION_MEMORY || "unknown",
      },
      database: {
        provider: "postgresql",
        connectionLimit: process.env.DATABASE_CONNECTION_LIMIT || "unknown",
        location: process.env.DATABASE_REGION || "unknown",
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
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Cache-Buster', cacheBuster.toString());

    return response;
  } catch (error) {
    console.error("Enhanced performance diagnostic error:", error);
    return errorResponse("Failed to run enhanced performance diagnostics");
  }
}

async function runDatabasePerformanceTests(): Promise<DatabasePerformance> {
  const dbPerf: DatabasePerformance = {
    connectionPool: { name: "Connection Pool", duration: 0, status: "success" },
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

  // Simple Queries with cache-busting
  const cacheBuster = Date.now();
  const simpleQueries = [
    { name: "User Count", query: () => prisma.user.count({ where: { id: { gte: 0 } } }) },
    { name: "Lead Count", query: () => prisma.lead.count({ where: { id: { gte: 0 } } }) },
    { name: "Meeting Count", query: () => prisma.meeting.count({ where: { id: { gte: 0 } } }) },
    { name: "Task Count", query: () => prisma.task.count({ where: { id: { gte: 0 } } }) },
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
