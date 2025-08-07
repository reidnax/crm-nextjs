"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Database,
  Server,
  Wifi,
  AlertTriangle,
  Shield,
} from "lucide-react";

interface PerformanceData {
  timestamp: string;
  environment: string;
  region: string;
  dbConnection: {
    status: string;
    duration: number;
  };
  simpleQuery: {
    status: string;
    result: number;
    duration: number;
  };
  complexQueries: {
    status: string;
    results: Record<string, number>;
    duration: number;
  };
  permissionChecks: {
    status: string;
    results: Array<{
      permission: string;
      hasPermission: boolean;
      duration: number;
    }>;
    totalDuration: number;
  };
  coldStart: string;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  totalDuration: number;
  recommendations: string[];
  bottleneck: {
    isDatabase: boolean;
    isPermissionSystem: boolean;
    isVercel: boolean;
    isNetwork: boolean;
  };
}

interface DashboardComparison {
  regularDashboard: {
    status: number;
    duration: number;
    success: boolean;
    dataSize: number;
  };
  optimizedDashboard: {
    status: number;
    duration: number;
    success: boolean;
    dataSize: number;
  };
  analysis: {
    regularFaster: boolean;
    improvement: number;
    recommendation: string;
  };
  bottleneck: {
    isDatabase: boolean;
    isVercel: boolean;
    isNetwork: boolean;
  };
}

export default function PerformanceMonitorNew() {
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [dashboardComparison, setDashboardComparison] =
    useState<DashboardComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPerformanceTest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/performance-new");
      const result = await response.json();

      if (result.success) {
        setPerformanceData(result.data);
      } else {
        setError(result.message || "Failed to run performance test");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runDashboardComparison = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/dashboard-comparison-new");
      const result = await response.json();

      if (result.success) {
        setDashboardComparison(result.data);
      } else {
        setError(result.message || "Failed to run dashboard comparison");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceStatus = (duration: number) => {
    if (duration < 500) return { status: "excellent", color: "bg-green-500" };
    if (duration < 1000) return { status: "good", color: "bg-yellow-500" };
    if (duration < 2000) return { status: "slow", color: "bg-orange-500" };
    return { status: "very slow", color: "bg-red-500" };
  };

  const getBottleneckIcon = () => {
    if (!dashboardComparison) return null;

    if (dashboardComparison.bottleneck.isDatabase)
      return <Database className="h-4 w-4" />;
    if (dashboardComparison.bottleneck.isVercel)
      return <Server className="h-4 w-4" />;
    if (dashboardComparison.bottleneck.isNetwork)
      return <Wifi className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex gap-4">
        <Button onClick={runPerformanceTest} disabled={loading}>
          {loading ? "Running..." : "Run Performance Test (New)"}
        </Button>
        <Button
          onClick={runDashboardComparison}
          disabled={loading}
          variant="outline"
        >
          {loading ? "Running..." : "Compare Dashboard APIs (New)"}
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {performanceData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance Diagnostics (New Route)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Database Connection</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      performanceData.dbConnection.status === "success"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {performanceData.dbConnection.status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {performanceData.dbConnection.duration}ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Simple Query</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      performanceData.simpleQuery.status === "success"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {performanceData.simpleQuery.status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {performanceData.simpleQuery.duration}ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Complex Queries</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      performanceData.complexQueries.status === "success"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {performanceData.complexQueries.status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {performanceData.complexQueries.duration}ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Permission Checks</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      performanceData.permissionChecks?.status === "success"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {performanceData.permissionChecks?.status || "N/A"}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {performanceData.permissionChecks?.totalDuration || 0}ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Total Duration</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      getPerformanceStatus(performanceData.totalDuration).color
                    }
                  >
                    {getPerformanceStatus(performanceData.totalDuration).status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {performanceData.totalDuration}ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Memory Usage</h4>
                <div className="text-sm text-gray-600">
                  Heap: {performanceData.memoryUsage.heapUsed}MB /{" "}
                  {performanceData.memoryUsage.heapTotal}MB
                </div>
              </div>
            </div>

            {/* Bottleneck Analysis */}
            <div className="space-y-2">
              <h4 className="font-medium">Bottleneck Analysis</h4>
              <div className="flex gap-2">
                {performanceData.bottleneck.isDatabase && (
                  <Badge variant="destructive">
                    <Database className="h-3 w-3 mr-1" />
                    Database
                  </Badge>
                )}
                {performanceData.bottleneck.isPermissionSystem && (
                  <Badge variant="destructive">
                    <Shield className="h-3 w-3 mr-1" />
                    Permissions
                  </Badge>
                )}
                {performanceData.bottleneck.isVercel && (
                  <Badge variant="destructive">
                    <Server className="h-3 w-3 mr-1" />
                    Vercel
                  </Badge>
                )}
                {performanceData.bottleneck.isNetwork && (
                  <Badge variant="destructive">
                    <Wifi className="h-3 w-3 mr-1" />
                    Network
                  </Badge>
                )}
                {!performanceData.bottleneck.isDatabase &&
                  !performanceData.bottleneck.isPermissionSystem &&
                  !performanceData.bottleneck.isVercel &&
                  !performanceData.bottleneck.isNetwork && (
                    <Badge variant="default">No Major Issues</Badge>
                  )}
              </div>
            </div>

            {performanceData.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {performanceData.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {dashboardComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getBottleneckIcon()}
              Dashboard API Comparison (New Route)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Regular Dashboard</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        dashboardComparison.regularDashboard.success
                          ? "default"
                          : "destructive"
                      }
                    >
                      {dashboardComparison.regularDashboard.status}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {dashboardComparison.regularDashboard.duration}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Data size: {dashboardComparison.regularDashboard.dataSize}{" "}
                    bytes
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Optimized Dashboard</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        dashboardComparison.optimizedDashboard.success
                          ? "default"
                          : "destructive"
                      }
                    >
                      {dashboardComparison.optimizedDashboard.status}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {dashboardComparison.optimizedDashboard.duration}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Data size: {dashboardComparison.optimizedDashboard.dataSize}{" "}
                    bytes
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Analysis</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Improvement:</span>
                  <Badge
                    variant={
                      dashboardComparison.analysis.improvement > 0
                        ? "default"
                        : "secondary"
                    }
                  >
                    {dashboardComparison.analysis.improvement}%
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {dashboardComparison.analysis.recommendation}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Bottleneck Detection</h4>
              <div className="flex gap-2">
                {dashboardComparison.bottleneck.isDatabase && (
                  <Badge variant="destructive">Database</Badge>
                )}
                {dashboardComparison.bottleneck.isVercel && (
                  <Badge variant="destructive">Vercel</Badge>
                )}
                {dashboardComparison.bottleneck.isNetwork && (
                  <Badge variant="destructive">Network</Badge>
                )}
                {!dashboardComparison.bottleneck.isDatabase &&
                  !dashboardComparison.bottleneck.isVercel &&
                  !dashboardComparison.bottleneck.isNetwork && (
                    <Badge variant="default">No Major Issues</Badge>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
