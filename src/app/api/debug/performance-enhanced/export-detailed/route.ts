import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NextRequest } from "next/server";

interface PerformanceMetric {
  name: string;
  duration: number;
  status: "success" | "error" | "warning";
  details?: any;
  error?: string;
  recommendations?: string[];
}

interface EnhancedPerformanceData {
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
  database: {
    connectionPool: PerformanceMetric;
    simpleQueries: PerformanceMetric[];
    complexQueries: PerformanceMetric[];
    aggregateQueries: PerformanceMetric[];
    transactions: PerformanceMetric[];
  };
  system: {
    memory: {
      heap: { used: number; total: number; limit: number };
      external: number;
      rss: number;
      buffers: number;
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
  };
  network: {
    dns: PerformanceMetric;
    externalAPIs: PerformanceMetric[];
    latency: {
      database: number;
      internal: number;
      external: number;
    };
  };
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
  meta: {
    executionTime: number;
    testsConducted: number;
    version: string;
  };
}

// Helper function to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Generate summary sheet
function generateSummarySheet(data: EnhancedPerformanceData): string {
  const rows = [
    ["Performance Diagnostics Summary Report"],
    [""],
    ["Timestamp", data.timestamp],
    ["Overall Performance Score", data.performanceScore.overall],
    ["Database Score", data.performanceScore.database],
    ["System Score", data.performanceScore.system],
    ["Network Score", data.performanceScore.network],
    ["Permissions Score", data.performanceScore.permissions],
    [""],
    ["Bottlenecks"],
    ["Primary Bottleneck", data.bottlenecks.primary],
    ["Severity", data.bottlenecks.severity],
    ["Secondary Issues", data.bottlenecks.secondary.join("; ")],
    [""],
    ["Environment"],
    ["Node Version", data.environment.node],
    ["Region", data.environment.vercel.region],
    ["Memory Limit", data.environment.vercel.memory],
    ["Database Provider", data.environment.database.provider],
    ["Database Location", data.environment.database.location],
    [""],
    ["System Resources"],
    ["Memory Used (MB)", data.system.memory.heap.used],
    ["Memory Total (MB)", data.system.memory.heap.total],
    ["Memory Usage %", Math.round((data.system.memory.heap.used / data.system.memory.heap.total) * 100)],
    ["CPU User Time (ms)", data.system.cpu.userCPUTime],
    ["CPU System Time (ms)", data.system.cpu.systemCPUTime],
    ["Event Loop Lag (ms)", data.system.eventLoop.lag.toFixed(2)],
    [""],
    ["Network Performance"],
    ["Database Latency (ms)", data.network.latency.database.toFixed(1)],
    ["Internal API Latency (ms)", data.network.latency.internal.toFixed(1)],
    ["External API Latency (ms)", data.network.latency.external.toFixed(1)],
    [""],
    ["Test Results"],
    ["Total Tests Conducted", data.meta.testsConducted],
    ["Execution Time (ms)", data.meta.executionTime],
    ["Version", data.meta.version],
    [""],
    ["Recommendations"],
    ["Immediate Actions", data.recommendations.immediate.join("; ")],
    ["Short Term", data.recommendations.shortTerm.join("; ")],
    ["Long Term", data.recommendations.longTerm.join("; ")]
  ];

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
}

// Generate database performance sheet
function generateDatabaseSheet(data: EnhancedPerformanceData): string {
  const rows = [
    ["Database Performance Details"],
    [""],
    ["Connection Pool"],
    ["Name", "Duration (ms)", "Status", "Error"],
    [
      data.database.connectionPool.name,
      data.database.connectionPool.duration,
      data.database.connectionPool.status,
      data.database.connectionPool.error || ""
    ],
    [""],
    ["Simple Queries"],
    ["Name", "Duration (ms)", "Status", "Count", "Details"]
  ];

  data.database.simpleQueries.forEach(query => {
    rows.push([
      query.name,
      query.duration,
      query.status,
      query.details?.count || "",
      JSON.stringify(query.details || {})
    ]);
  });

  rows.push([""]);
  rows.push(["Complex Queries"]);
  rows.push(["Name", "Duration (ms)", "Status", "Details"]);

  data.database.complexQueries.forEach(query => {
    rows.push([
      query.name,
      query.duration,
      query.status,
      JSON.stringify(query.details || {})
    ]);
  });

  rows.push([""]);
  rows.push(["Aggregate Queries"]);
  rows.push(["Name", "Duration (ms)", "Status", "Details"]);

  data.database.aggregateQueries.forEach(query => {
    rows.push([
      query.name,
      query.duration,
      query.status,
      JSON.stringify(query.details || {})
    ]);
  });

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
}

// Generate system performance sheet
function generateSystemSheet(data: EnhancedPerformanceData): string {
  const rows = [
    ["System Performance Details"],
    [""],
    ["Memory Usage"],
    ["Metric", "Value (MB)", "Percentage"],
    ["Heap Used", data.system.memory.heap.used, Math.round((data.system.memory.heap.used / data.system.memory.heap.total) * 100)],
    ["Heap Total", data.system.memory.heap.total, ""],
    ["Heap Limit", data.system.memory.heap.limit, ""],
    ["External Memory", data.system.memory.external, ""],
    ["RSS", data.system.memory.rss, ""],
    ["Buffers", data.system.memory.buffers, ""],
    [""],
    ["CPU Usage"],
    ["Metric", "Value (ms)"],
    ["User CPU Time", data.system.cpu.userCPUTime],
    ["System CPU Time", data.system.cpu.systemCPUTime],
    [""],
    ["Event Loop"],
    ["Metric", "Value"],
    ["Lag (ms)", data.system.eventLoop.lag.toFixed(2)],
    ["Utilization %", (data.system.eventLoop.utilization * 100).toFixed(1)],
    [""],
    ["Garbage Collection"],
    ["Metric", "Value"],
    ["Collections", data.system.gc.collections],
    ["Total Time (ms)", data.system.gc.totalTime],
    ["Average Time (ms)", data.system.gc.avgTime]
  ];

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
}

// Generate network performance sheet
function generateNetworkSheet(data: EnhancedPerformanceData): string {
  const rows = [
    ["Network Performance Details"],
    [""],
    ["DNS Resolution"],
    ["Name", "Duration (ms)", "Status", "Error"],
    [
      data.network.dns.name,
      data.network.dns.duration,
      data.network.dns.status,
      data.network.dns.error || ""
    ],
    [""],
    ["Latency Measurements"],
    ["Type", "Latency (ms)"],
    ["Database", data.network.latency.database.toFixed(1)],
    ["Internal APIs", data.network.latency.internal.toFixed(1)],
    ["External APIs", data.network.latency.external.toFixed(1)],
    [""],
    ["External API Tests"],
    ["Name", "Duration (ms)", "Status", "Details"]
  ];

  data.network.externalAPIs.forEach(api => {
    rows.push([
      api.name,
      api.duration,
      api.status,
      JSON.stringify(api.details || {})
    ]);
  });

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
}

// Generate permissions performance sheet
function generatePermissionsSheet(data: EnhancedPerformanceData): string {
  const rows = [
    ["Permission System Performance"],
    [""],
    ["Permission", "Duration (ms)", "Status", "Has Permission", "Details"]
  ];

  data.permissions.forEach(permission => {
    rows.push([
      permission.name,
      permission.duration.toFixed(1),
      permission.status,
      permission.details?.hasPermission ? "Yes" : "No",
      JSON.stringify(permission.details || {})
    ]);
  });

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
}

// GET /api/debug/performance-enhanced/export-detailed - Export detailed performance diagnostics as CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get the performance data from the request body
    const data: EnhancedPerformanceData = await request.json();

    if (!data) {
      return errorResponse("No performance data provided");
    }

    // Generate all sheets
    const summarySheet = generateSummarySheet(data);
    const databaseSheet = generateDatabaseSheet(data);
    const systemSheet = generateSystemSheet(data);
    const networkSheet = generateNetworkSheet(data);
    const permissionsSheet = generatePermissionsSheet(data);

    // Combine all sheets with clear separators
    const combinedCSV = [
      "=== PERFORMANCE DIAGNOSTICS SUMMARY ===",
      summarySheet,
      "",
      "=== DATABASE PERFORMANCE ===",
      databaseSheet,
      "",
      "=== SYSTEM PERFORMANCE ===",
      systemSheet,
      "",
      "=== NETWORK PERFORMANCE ===",
      networkSheet,
      "",
      "=== PERMISSIONS PERFORMANCE ===",
      permissionsSheet
    ].join("\n");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `detailed-performance-diagnostics-${timestamp}.csv`;

    return new Response(combinedCSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Detailed CSV export error:", error);
    return errorResponse("Failed to export detailed CSV");
  }
} 