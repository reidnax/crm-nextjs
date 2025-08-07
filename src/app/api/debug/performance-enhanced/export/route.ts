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

// POST /api/debug/performance-enhanced/export - Export performance diagnostics as CSV
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

    // Generate CSV content
    const csvRows: string[] = [];
    
    // Header row
    const headers = [
      "Timestamp",
      "Environment_Node",
      "Environment_Vercel_Region",
      "Environment_Vercel_Timeout",
      "Environment_Vercel_Memory",
      "Environment_Database_Provider",
      "Environment_Database_ConnectionLimit",
      "Environment_Database_Location",
      "Database_ConnectionPool_Name",
      "Database_ConnectionPool_Duration",
      "Database_ConnectionPool_Status",
      "Database_ConnectionPool_Error",
      "System_Memory_Heap_Used",
      "System_Memory_Heap_Total",
      "System_Memory_Heap_Limit",
      "System_Memory_External",
      "System_Memory_RSS",
      "System_Memory_Buffers",
      "System_CPU_UserCPUTime",
      "System_CPU_SystemCPUTime",
      "System_EventLoop_Lag",
      "System_EventLoop_Utilization",
      "System_GC_Collections",
      "System_GC_TotalTime",
      "System_GC_AvgTime",
      "Network_DNS_Name",
      "Network_DNS_Duration",
      "Network_DNS_Status",
      "Network_DNS_Error",
      "Network_Latency_Database",
      "Network_Latency_Internal",
      "Network_Latency_External",
      "Bottlenecks_Primary",
      "Bottlenecks_Secondary",
      "Bottlenecks_Severity",
      "PerformanceScore_Overall",
      "PerformanceScore_Database",
      "PerformanceScore_System",
      "PerformanceScore_Network",
      "PerformanceScore_Permissions",
      "Trends_Improving",
      "Trends_Degrading",
      "Trends_Stable",
      "Meta_ExecutionTime",
      "Meta_TestsConducted",
      "Meta_Version",
      "Recommendations_Immediate",
      "Recommendations_ShortTerm",
      "Recommendations_LongTerm",
      "Database_SimpleQueries",
      "Database_ComplexQueries",
      "Database_AggregateQueries",
      "Network_ExternalAPIs",
      "Permissions_Details"
    ];

    csvRows.push(headers.join(","));

    // Data row
    const dataRow = [
      escapeCSV(data.timestamp),
      escapeCSV(data.environment.node),
      escapeCSV(data.environment.vercel.region),
      escapeCSV(data.environment.vercel.timeout),
      escapeCSV(data.environment.vercel.memory),
      escapeCSV(data.environment.database.provider),
      escapeCSV(data.environment.database.connectionLimit),
      escapeCSV(data.environment.database.location),
      escapeCSV(data.database.connectionPool.name),
      escapeCSV(data.database.connectionPool.duration),
      escapeCSV(data.database.connectionPool.status),
      escapeCSV(data.database.connectionPool.error || ""),
      escapeCSV(data.system.memory.heap.used),
      escapeCSV(data.system.memory.heap.total),
      escapeCSV(data.system.memory.heap.limit),
      escapeCSV(data.system.memory.external),
      escapeCSV(data.system.memory.rss),
      escapeCSV(data.system.memory.buffers),
      escapeCSV(data.system.cpu.userCPUTime),
      escapeCSV(data.system.cpu.systemCPUTime),
      escapeCSV(data.system.eventLoop.lag),
      escapeCSV(data.system.eventLoop.utilization),
      escapeCSV(data.system.gc.collections),
      escapeCSV(data.system.gc.totalTime),
      escapeCSV(data.system.gc.avgTime),
      escapeCSV(data.network.dns.name),
      escapeCSV(data.network.dns.duration),
      escapeCSV(data.network.dns.status),
      escapeCSV(data.network.dns.error || ""),
      escapeCSV(data.network.latency.database),
      escapeCSV(data.network.latency.internal),
      escapeCSV(data.network.latency.external),
      escapeCSV(data.bottlenecks.primary),
      escapeCSV(data.bottlenecks.secondary.join("; ")),
      escapeCSV(data.bottlenecks.severity),
      escapeCSV(data.performanceScore.overall),
      escapeCSV(data.performanceScore.database),
      escapeCSV(data.performanceScore.system),
      escapeCSV(data.performanceScore.network),
      escapeCSV(data.performanceScore.permissions),
      escapeCSV(data.trends.improving),
      escapeCSV(data.trends.degrading),
      escapeCSV(data.trends.stable),
      escapeCSV(data.meta.executionTime),
      escapeCSV(data.meta.testsConducted),
      escapeCSV(data.meta.version),
      escapeCSV(data.recommendations.immediate.join("; ")),
      escapeCSV(data.recommendations.shortTerm.join("; ")),
      escapeCSV(data.recommendations.longTerm.join("; ")),
      escapeCSV(data.database.simpleQueries.map(q => `${q.name}:${q.duration}ms:${q.status}`).join("; ")),
      escapeCSV(data.database.complexQueries.map(q => `${q.name}:${q.duration}ms:${q.status}`).join("; ")),
      escapeCSV(data.database.aggregateQueries.map(q => `${q.name}:${q.duration}ms:${q.status}`).join("; ")),
      escapeCSV(data.network.externalAPIs.map(api => `${api.name}:${api.duration}ms:${api.status}`).join("; ")),
      escapeCSV(data.permissions.map(p => `${p.name}:${p.duration}ms:${p.status}`).join("; "))
    ];

    csvRows.push(dataRow.join(","));

    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `performance-diagnostics-${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return errorResponse("Failed to export CSV");
  }
}
