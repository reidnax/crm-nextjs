"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Database,
  Server,
  Wifi,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Cpu,
  HardDrive,
  Zap,
  Eye,
  Download,
} from "lucide-react";

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
      pooling?: string;
      poolTimeout?: string;
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

interface ConnectionPoolDiagnostics {
  timestamp: string;
  environment: {
    node: string;
    region: string;
    databaseProvider: string;
    connectionPooling: string;
  };
  tests: {
    connectionPoolLoad: PerformanceMetric;
    connectionPoolStatus: PerformanceMetric;
    sustainedLoad: PerformanceMetric;
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
  };
}

export default function EnhancedPerformanceMonitor() {
  const [performanceData, setPerformanceData] =
    useState<EnhancedPerformanceData | null>(null);
  const [connectionPoolData, setConnectionPoolData] =
    useState<ConnectionPoolDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEnhancedPerformanceTest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/performance-enhanced");
      const result = await response.json();

      if (result.success) {
        setPerformanceData(result.data);
      } else {
        setError(result.message || "Failed to run enhanced performance test");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runConnectionPoolDiagnostics = async () => {
    setPoolLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/connection-pool-diagnostics");
      const result = await response.json();

      if (result.success) {
        setConnectionPoolData(result.data);
      } else {
        setError(result.message || "Failed to run connection pool diagnostics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPoolLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreColorBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendIcon = (trends: any) => {
    if (trends.improving)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trends.degrading)
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const exportToCSV = async () => {
    if (!performanceData) return;

    setExporting(true);
    try {
      const response = await fetch("/api/debug/performance-enhanced/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(performanceData),
      });

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-diagnostics-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const exportDetailedCSV = async () => {
    if (!performanceData) return;

    setExporting(true);
    try {
      const response = await fetch(
        "/api/debug/performance-enhanced/export-detailed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(performanceData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export detailed CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `detailed-performance-diagnostics-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export detailed CSV"
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Enhanced Performance Diagnostics
          </h2>
          <p className="text-gray-600">
            Comprehensive performance analysis and bottleneck detection
          </p>
        </div>
        <div className="flex gap-2">
          {performanceData && (
            <>
              <Button
                onClick={exportToCSV}
                disabled={exporting}
                variant="outline"
                size="lg"
              >
                {exporting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                onClick={exportDetailedCSV}
                disabled={exporting}
                variant="outline"
                size="lg"
              >
                {exporting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Detailed CSV
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            onClick={runEnhancedPerformanceTest}
            disabled={loading || poolLoading}
            size="lg"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running Deep Analysis...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Run Enhanced Diagnostics
              </>
            )}
          </Button>

          <Button
            onClick={runConnectionPoolDiagnostics}
            disabled={loading || poolLoading}
            size="lg"
            variant="outline"
          >
            {poolLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Testing Connection Pool...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Connection Pool Test
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {connectionPoolData && (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-center py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg">
              🔗 Connection Pool Test Results
            </h2>
          </div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Connection Pool Diagnostics
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    connectionPoolData.analysis.overallStatus === "excellent"
                      ? "bg-green-100 text-green-800"
                      : connectionPoolData.analysis.overallStatus === "good"
                      ? "bg-blue-100 text-blue-800"
                      : connectionPoolData.analysis.overallStatus === "warning"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {connectionPoolData.analysis.overallStatus.toUpperCase()} -
                  Score: {connectionPoolData.analysis.performanceScore}/100
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Environment Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Environment</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Node.js:</span>
                    <span className="ml-1 font-mono">
                      {connectionPoolData.environment.node}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Region:</span>
                    <span className="ml-1 font-mono">
                      {connectionPoolData.environment.region}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <span className="ml-1">
                      {connectionPoolData.environment.databaseProvider}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pooling:</span>
                    <span
                      className={`ml-1 font-medium ${
                        connectionPoolData.environment.connectionPooling ===
                        "enabled"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {connectionPoolData.environment.connectionPooling}
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Connection Pool Load Test */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(
                      connectionPoolData.tests.connectionPoolLoad.status
                    )}
                    <h4 className="font-medium">
                      {connectionPoolData.tests.connectionPoolLoad.name}
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Duration:{" "}
                      <span className="font-mono">
                        {connectionPoolData.tests.connectionPoolLoad.duration.toFixed(
                          1
                        )}
                        ms
                      </span>
                    </div>
                    {connectionPoolData.tests.connectionPoolLoad.details && (
                      <>
                        <div>
                          Avg Connection:{" "}
                          <span className="font-mono">
                            {connectionPoolData.tests.connectionPoolLoad.details.avgConnectionTime.toFixed(
                              1
                            )}
                            ms
                          </span>
                        </div>
                        <div>
                          Max Connection:{" "}
                          <span className="font-mono">
                            {connectionPoolData.tests.connectionPoolLoad.details.maxConnectionTime.toFixed(
                              1
                            )}
                            ms
                          </span>
                        </div>
                        <div>
                          Failures:{" "}
                          <span
                            className={`font-mono ${
                              connectionPoolData.tests.connectionPoolLoad
                                .details.connectionFailures > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {
                              connectionPoolData.tests.connectionPoolLoad
                                .details.connectionFailures
                            }
                          </span>
                        </div>
                        <div>
                          Throughput:{" "}
                          <span className="font-mono">
                            {connectionPoolData.tests.connectionPoolLoad.details.throughput.toFixed(
                              1
                            )}{" "}
                            conn/s
                          </span>
                        </div>
                      </>
                    )}
                    {connectionPoolData.tests.connectionPoolLoad.error && (
                      <div className="text-red-600 text-xs mt-2">
                        {connectionPoolData.tests.connectionPoolLoad.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Pool Status */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(
                      connectionPoolData.tests.connectionPoolStatus.status
                    )}
                    <h4 className="font-medium">
                      {connectionPoolData.tests.connectionPoolStatus.name}
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Duration:{" "}
                      <span className="font-mono">
                        {connectionPoolData.tests.connectionPoolStatus.duration.toFixed(
                          1
                        )}
                        ms
                      </span>
                    </div>
                    {connectionPoolData.tests.connectionPoolStatus.details && (
                      <>
                        <div>
                          Active:{" "}
                          <span className="font-mono">
                            {
                              connectionPoolData.tests.connectionPoolStatus
                                .details.activeConnections
                            }
                          </span>
                        </div>
                        <div>
                          Max:{" "}
                          <span className="font-mono">
                            {
                              connectionPoolData.tests.connectionPoolStatus
                                .details.maxConnections
                            }
                          </span>
                        </div>
                        <div>
                          Utilization:{" "}
                          <span
                            className={`font-mono ${
                              connectionPoolData.tests.connectionPoolStatus
                                .details.utilization > 80
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {connectionPoolData.tests.connectionPoolStatus.details.utilization.toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>
                        <div>
                          Server:{" "}
                          <span className="font-mono text-xs">
                            {
                              connectionPoolData.tests.connectionPoolStatus
                                .details.serverVersion
                            }
                          </span>
                        </div>
                      </>
                    )}
                    {connectionPoolData.tests.connectionPoolStatus.error && (
                      <div className="text-red-600 text-xs mt-2">
                        {connectionPoolData.tests.connectionPoolStatus.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sustained Load Test */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(
                      connectionPoolData.tests.sustainedLoad.status
                    )}
                    <h4 className="font-medium">
                      {connectionPoolData.tests.sustainedLoad.name}
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Duration:{" "}
                      <span className="font-mono">
                        {connectionPoolData.tests.sustainedLoad.duration.toFixed(
                          1
                        )}
                        ms
                      </span>
                    </div>
                    {connectionPoolData.tests.sustainedLoad.details && (
                      <>
                        <div>
                          Total Queries:{" "}
                          <span className="font-mono">
                            {
                              connectionPoolData.tests.sustainedLoad.details
                                .totalQueries
                            }
                          </span>
                        </div>
                        <div>
                          Successful:{" "}
                          <span className="font-mono text-green-600">
                            {
                              connectionPoolData.tests.sustainedLoad.details
                                .successfulQueries
                            }
                          </span>
                        </div>
                        <div>
                          Failed:{" "}
                          <span
                            className={`font-mono ${
                              connectionPoolData.tests.sustainedLoad.details
                                .failedQueries > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {
                              connectionPoolData.tests.sustainedLoad.details
                                .failedQueries
                            }
                          </span>
                        </div>
                        <div>
                          QPS:{" "}
                          <span className="font-mono">
                            {connectionPoolData.tests.sustainedLoad.details.queriesPerSecond.toFixed(
                              1
                            )}
                          </span>
                        </div>
                        <div>
                          Avg Response:{" "}
                          <span className="font-mono">
                            {connectionPoolData.tests.sustainedLoad.details.avgResponseTime.toFixed(
                              1
                            )}
                            ms
                          </span>
                        </div>
                      </>
                    )}
                    {connectionPoolData.tests.sustainedLoad.error && (
                      <div className="text-red-600 text-xs mt-2">
                        {connectionPoolData.tests.sustainedLoad.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis & Recommendations */}
              <div className="space-y-4">
                {connectionPoolData.analysis.primaryIssues.length > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">
                      ⚠️ Issues Detected
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {connectionPoolData.analysis.primaryIssues.map(
                        (issue, index) => (
                          <li key={index}>{issue}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {connectionPoolData.analysis.recommendations.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      💡 Recommendations
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                      {connectionPoolData.analysis.recommendations.map(
                        (rec, index) => (
                          <li key={index}>{rec}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Enhanced Connection Pool Recommendations */}
              <div className="space-y-4 mt-6">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  🔧 Connection Pool Optimization Guide
                </h4>

                {/* Optimal Configuration */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">
                    ✅ Optimal Configuration
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Recommended DATABASE_URL:</strong>
                      <code className="block bg-white p-2 mt-1 rounded text-xs font-mono overflow-x-auto">
                        postgresql://user:pass@host/db?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=25&pool_timeout=15&connect_timeout=10&idle_timeout=300
                      </code>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1">
                        <strong>Production Settings:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-700">
                          <li>
                            <code>pgbouncer=true</code> - Enable pooling (10,000
                            connections)
                          </li>
                          <li>
                            <code>connection_limit=25</code> - Optimal for CRM
                            workload
                          </li>
                          <li>
                            <code>pool_timeout=15</code> - Fast failure
                            detection
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <strong>Performance Targets:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-700">
                          <li>Connection time: &lt; 50ms</li>
                          <li>Pool utilization: &lt; 70%</li>
                          <li>Query throughput: &gt; 20 QPS</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Analysis */}
                {connectionPoolData.tests.connectionPoolLoad.details && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">
                      📊 Your Current Performance
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-medium text-gray-600">
                          Avg Connection
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            connectionPoolData.tests.connectionPoolLoad.details
                              .avgConnectionTime < 50
                              ? "text-green-600"
                              : connectionPoolData.tests.connectionPoolLoad
                                  .details.avgConnectionTime < 200
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {connectionPoolData.tests.connectionPoolLoad.details.avgConnectionTime.toFixed(
                            0
                          )}
                          ms
                        </div>
                        <div className="text-xs text-gray-500">
                          {connectionPoolData.tests.connectionPoolLoad.details
                            .avgConnectionTime < 50
                            ? "Excellent"
                            : connectionPoolData.tests.connectionPoolLoad
                                .details.avgConnectionTime < 200
                            ? "Good"
                            : "Needs Work"}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-medium text-gray-600">
                          Throughput
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            connectionPoolData.tests.connectionPoolLoad.details
                              .throughput > 20
                              ? "text-green-600"
                              : connectionPoolData.tests.connectionPoolLoad
                                  .details.throughput > 10
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {connectionPoolData.tests.connectionPoolLoad.details.throughput.toFixed(
                            1
                          )}
                        </div>
                        <div className="text-xs text-gray-500">conn/s</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-medium text-gray-600">
                          Failures
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            connectionPoolData.tests.connectionPoolLoad.details
                              .connectionFailures === 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {
                            connectionPoolData.tests.connectionPoolLoad.details
                              .connectionFailures
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {connectionPoolData.tests.connectionPoolLoad.details
                            .connectionFailures === 0
                            ? "Perfect"
                            : "Issues Found"}
                        </div>
                      </div>
                      {connectionPoolData.tests.connectionPoolStatus
                        .details && (
                        <div className="bg-white p-2 rounded text-center">
                          <div className="font-medium text-gray-600">
                            Utilization
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              connectionPoolData.tests.connectionPoolStatus
                                .details.utilization < 50
                                ? "text-green-600"
                                : connectionPoolData.tests.connectionPoolStatus
                                    .details.utilization < 80
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {connectionPoolData.tests.connectionPoolStatus.details.utilization.toFixed(
                              0
                            )}
                            %
                          </div>
                          <div className="text-xs text-gray-500">
                            pool usage
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Critical Issues */}
                {(connectionPoolData.environment.connectionPooling ===
                  "disabled" ||
                  (connectionPoolData.tests.connectionPoolLoad.details &&
                    connectionPoolData.tests.connectionPoolLoad.details
                      .connectionFailures > 0) ||
                  (connectionPoolData.tests.connectionPoolLoad.details &&
                    connectionPoolData.tests.connectionPoolLoad.details
                      .avgConnectionTime > 500)) && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h5 className="font-medium text-red-800 mb-2">
                      🚨 Critical Issues
                    </h5>
                    <div className="space-y-2 text-sm">
                      {connectionPoolData.environment.connectionPooling ===
                        "disabled" && (
                        <div className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <div>
                            <strong>Connection Pooling Disabled</strong>
                            <p className="text-red-700">
                              Add{" "}
                              <code className="bg-white px-1 rounded">
                                pgbouncer=true
                              </code>{" "}
                              to your DATABASE_URL immediately. This is causing
                              10x slower connections.
                            </p>
                          </div>
                        </div>
                      )}
                      {connectionPoolData.tests.connectionPoolLoad.details &&
                        connectionPoolData.tests.connectionPoolLoad.details
                          .connectionFailures > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600 font-bold">•</span>
                            <div>
                              <strong>Connection Failures Detected</strong>
                              <p className="text-red-700">
                                {
                                  connectionPoolData.tests.connectionPoolLoad
                                    .details.connectionFailures
                                }{" "}
                                failed connections. Check your connection limits
                                and Neon.tech quota.
                              </p>
                            </div>
                          </div>
                        )}
                      {connectionPoolData.tests.connectionPoolLoad.details &&
                        connectionPoolData.tests.connectionPoolLoad.details
                          .avgConnectionTime > 500 && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600 font-bold">•</span>
                            <div>
                              <strong>High Connection Latency</strong>
                              <p className="text-red-700">
                                Average connection time:{" "}
                                {
                                  connectionPoolData.tests.connectionPoolLoad
                                    .details.avgConnectionTime
                                }
                                ms (should be &lt;100ms). Check network latency
                                and pooling configuration.
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-800 mb-2">
                    🎯 Next Steps
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <strong>Immediate Actions:</strong>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700 mt-1">
                          <li>
                            Verify <code>pgbouncer=true</code> in DATABASE_URL
                          </li>
                          <li>
                            Set <code>connection_limit=25</code> for production
                          </li>
                          <li>Monitor connection pool utilization</li>
                          <li>Test during peak traffic hours</li>
                        </ol>
                      </div>
                      <div>
                        <strong>Performance Monitoring:</strong>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700 mt-1">
                          <li>Run this test weekly</li>
                          <li>Alert if avg connection time &gt; 100ms</li>
                          <li>Monitor pool utilization &lt; 80%</li>
                          <li>Track query throughput trends</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Information */}
              <div className="text-xs text-gray-500 border-t pt-3">
                <div className="flex justify-between">
                  <span>
                    Execution Time: {connectionPoolData.meta.executionTime}ms
                  </span>
                  <span>
                    Tests Conducted: {connectionPoolData.meta.testsConducted}
                  </span>
                  <span>
                    Timestamp:{" "}
                    {new Date(connectionPoolData.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {performanceData && (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-center py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg shadow-lg">
              📊 Enhanced Performance Diagnostics Results
            </h2>
          </div>
          {/* Performance Score Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${getScoreColor(
                      performanceData.performanceScore.overall
                    )}`}
                  >
                    {performanceData.performanceScore.overall}
                  </div>
                  <div className="text-sm text-gray-600">Overall</div>
                  <Progress
                    value={performanceData.performanceScore.overall}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      performanceData.performanceScore.database
                    )}`}
                  >
                    {performanceData.performanceScore.database}
                  </div>
                  <div className="text-sm text-gray-600">Database</div>
                  <Progress
                    value={performanceData.performanceScore.database}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      performanceData.performanceScore.system
                    )}`}
                  >
                    {performanceData.performanceScore.system}
                  </div>
                  <div className="text-sm text-gray-600">System</div>
                  <Progress
                    value={performanceData.performanceScore.system}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      performanceData.performanceScore.network
                    )}`}
                  >
                    {performanceData.performanceScore.network}
                  </div>
                  <div className="text-sm text-gray-600">Network</div>
                  <Progress
                    value={performanceData.performanceScore.network}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      performanceData.performanceScore.permissions
                    )}`}
                  >
                    {performanceData.performanceScore.permissions}
                  </div>
                  <div className="text-sm text-gray-600">Permissions</div>
                  <Progress
                    value={performanceData.performanceScore.permissions}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks and Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Bottleneck Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Severity:</span>
                  <Badge
                    className={getSeverityColor(
                      performanceData.bottlenecks.severity
                    )}
                  >
                    {performanceData.bottlenecks.severity.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">
                    Primary Bottleneck:
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {performanceData.bottlenecks.primary}
                  </p>
                </div>
                {performanceData.bottlenecks.secondary.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">
                      Secondary Issues:
                    </span>
                    <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                      {performanceData.bottlenecks.secondary.map(
                        (issue, index) => (
                          <li key={index}>{issue}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(performanceData.trends)}
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  <Badge
                    variant={
                      performanceData.trends.improving
                        ? "default"
                        : performanceData.trends.degrading
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {performanceData.trends.improving
                      ? "Improving"
                      : performanceData.trends.degrading
                      ? "Degrading"
                      : "Stable"}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Tests Conducted: {performanceData.meta.testsConducted}</p>
                  <p>Execution Time: {performanceData.meta.executionTime}ms</p>
                  <p>Version: {performanceData.meta.version}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Data */}
          <Tabs defaultValue="database" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                System
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Recommendations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="database" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Pool */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Connection Pool (Basic)</h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(
                        performanceData.database.connectionPool.status
                      )}
                      <span className="text-sm">
                        {performanceData.database.connectionPool.duration}ms
                      </span>
                    </div>
                  </div>

                  {/* Connection Pool Tests have been moved to separate diagnostics tool */}

                  {/* Simple Queries */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Simple Queries</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {performanceData.database.simpleQueries.map(
                        (query, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(query.status)}
                              <span className="text-sm">{query.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {query.duration}ms
                              {query.details?.count &&
                                ` (${query.details.count})`}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Complex Queries */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Complex Queries</h4>
                    {performanceData.database.complexQueries.map(
                      (query, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(query.status)}
                            <span className="text-sm">{query.name}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {query.duration}ms
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Memory Usage */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Memory Usage</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {performanceData.system.memory.heap.used}MB
                        </div>
                        <div className="text-xs text-gray-600">Heap Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {performanceData.system.memory.heap.total}MB
                        </div>
                        <div className="text-xs text-gray-600">Heap Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {performanceData.system.memory.rss}MB
                        </div>
                        <div className="text-xs text-gray-600">RSS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {performanceData.system.memory.external}MB
                        </div>
                        <div className="text-xs text-gray-600">External</div>
                      </div>
                    </div>
                    <Progress
                      value={
                        (performanceData.system.memory.heap.used /
                          performanceData.system.memory.heap.total) *
                        100
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* CPU and Event Loop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">CPU Usage</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">User CPU Time:</span>
                          <span className="text-sm">
                            {performanceData.system.cpu.userCPUTime}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">System CPU Time:</span>
                          <span className="text-sm">
                            {performanceData.system.cpu.systemCPUTime}ms
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Event Loop</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Lag:</span>
                          <span className="text-sm">
                            {performanceData.system.eventLoop.lag.toFixed(2)}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Utilization:</span>
                          <span className="text-sm">
                            {(
                              performanceData.system.eventLoop.utilization * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Latency Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {performanceData.network.latency.database.toFixed(1)}ms
                      </div>
                      <div className="text-xs text-gray-600">Database</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {performanceData.network.latency.internal.toFixed(1)}ms
                      </div>
                      <div className="text-xs text-gray-600">Internal APIs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {performanceData.network.latency.external.toFixed(1)}ms
                      </div>
                      <div className="text-xs text-gray-600">External APIs</div>
                    </div>
                  </div>

                  {/* DNS and External APIs */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Network Tests</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(performanceData.network.dns.status)}
                          <span className="text-sm">
                            {performanceData.network.dns.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {performanceData.network.dns.duration}ms
                        </span>
                      </div>
                      {performanceData.network.externalAPIs.map(
                        (api, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(api.status)}
                              <span className="text-sm">{api.name}</span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {api.duration}ms
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Permission System Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {performanceData.permissions.map((permission, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(permission.status)}
                          <span className="text-sm">{permission.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {permission.duration.toFixed(1)}ms
                          {permission.details?.hasPermission !== undefined && (
                            <Badge
                              variant={
                                permission.details.hasPermission
                                  ? "default"
                                  : "secondary"
                              }
                              className="ml-2"
                            >
                              {permission.details.hasPermission
                                ? "Granted"
                                : "Denied"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Immediate Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceData.recommendations.immediate.length > 0 ? (
                      <ul className="space-y-2">
                        {performanceData.recommendations.immediate.map(
                          (rec, index) => (
                            <li
                              key={index}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No immediate actions required
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-yellow-600">
                      Short Term
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceData.recommendations.shortTerm.length > 0 ? (
                      <ul className="space-y-2">
                        {performanceData.recommendations.shortTerm.map(
                          (rec, index) => (
                            <li
                              key={index}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <Clock className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No short-term actions needed
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600">Long Term</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceData.recommendations.longTerm.length > 0 ? (
                      <ul className="space-y-2">
                        {performanceData.recommendations.longTerm.map(
                          (rec, index) => (
                            <li
                              key={index}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No long-term actions needed
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Database URI Configuration */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database URI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      🔧 Optimal Neon.tech Configuration
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>Current DATABASE_URL should include:</strong>
                        <code className="block bg-white p-2 mt-1 rounded text-xs font-mono overflow-x-auto">
                          postgresql://user:pass@host/db?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=25&pool_timeout=20&connect_timeout=30&idle_timeout=300
                        </code>
                      </div>

                      {/* Connection Pool Analysis available in separate Connection Pool Test */}

                      <div className="space-y-1">
                        <strong>Critical Parameters:</strong>
                        <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                          <li>
                            <code>pgbouncer=true</code> - Enables connection
                            pooling (10,000 vs 839 connections)
                          </li>
                          <li>
                            <code>connection_limit=25</code> - Optimal for
                            production CRM (supports 15-25 concurrent users)
                          </li>
                          <li>
                            <code>pool_timeout=20</code> - Faster failure
                            detection during peak traffic
                          </li>
                          <li>
                            <code>connect_timeout=30</code> - Maximum time to
                            establish connection
                          </li>
                          <li>
                            <code>idle_timeout=300</code> - Close idle
                            connections after 5 minutes
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">
                        ✅ Production Ready
                      </h4>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>• Connection pool enabled</li>
                        <li>• SSL security enforced</li>
                        <li>• Timeout protection configured</li>
                        <li>• Optimal connection limits</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        ⚠️ Monitor These
                      </h4>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        <li>• Connection pool utilization</li>
                        <li>• Query response times</li>
                        <li>• Connection failures</li>
                        <li>• Database latency spikes</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">
                      🚨 Critical Issues
                    </h4>
                    <div className="space-y-2 text-xs text-red-700">
                      {performanceData.environment.database.pooling ===
                        "disabled" && (
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Missing pgbouncer=true</strong>
                            <p>
                              Add pgbouncer=true to your DATABASE_URL to fix
                              1,300ms+ connection delays
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Connection pool issues are now detected in the separate Connection Pool Test */}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      📊 Performance Benchmarks
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-green-600">
                          &lt; 50ms
                        </div>
                        <div className="text-gray-600">Excellent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">
                          50-200ms
                        </div>
                        <div className="text-gray-600">Good</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">
                          &gt; 200ms
                        </div>
                        <div className="text-gray-600">Needs Fix</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Environment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Runtime</h4>
                  <p>Node.js: {performanceData.environment.node}</p>
                  <p>Region: {performanceData.environment.vercel.region}</p>
                  <p>Memory: {performanceData.environment.vercel.memory}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Database</h4>
                  <p>
                    Provider: {performanceData.environment.database.provider}
                  </p>
                  <p>
                    Location: {performanceData.environment.database.location}
                  </p>
                  <p>
                    Pool Limit:{" "}
                    {performanceData.environment.database.connectionLimit}
                  </p>
                  {performanceData.environment.database.pooling && (
                    <p className="flex items-center gap-1">
                      Pooling:{" "}
                      <span
                        className={
                          performanceData.environment.database.pooling ===
                          "enabled"
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {performanceData.environment.database.pooling}
                      </span>
                    </p>
                  )}
                  {performanceData.environment.database.poolTimeout && (
                    <p className="text-xs text-gray-600">
                      Pool Timeout:{" "}
                      {performanceData.environment.database.poolTimeout ===
                      "not set"
                        ? "not set"
                        : `${performanceData.environment.database.poolTimeout}s`}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Test Results</h4>
                  <p>
                    Timestamp:{" "}
                    {new Date(performanceData.timestamp).toLocaleString()}
                  </p>
                  <p>Total Tests: {performanceData.meta.testsConducted}</p>
                  <p>Execution: {performanceData.meta.executionTime}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
