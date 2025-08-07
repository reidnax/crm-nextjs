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

export default function EnhancedPerformanceMonitor() {
  const [performanceData, setPerformanceData] =
    useState<EnhancedPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
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
        <Button
          onClick={runEnhancedPerformanceTest}
          disabled={loading}
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
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {performanceData && (
        <>
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
                    <h4 className="font-medium">Connection Pool</h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(
                        performanceData.database.connectionPool.status
                      )}
                      <span className="text-sm">
                        {performanceData.database.connectionPool.duration}ms
                      </span>
                    </div>
                  </div>

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
