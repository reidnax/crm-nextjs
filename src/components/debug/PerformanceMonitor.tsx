"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface PerformanceMetrics {
  timestamp: string;
  environment: string;
  region: string;
  dbConnection: {
    status: string;
    duration: number;
  };
  simpleQuery: {
    status: string;
    duration: number;
    result: number;
  };
  complexQueries: {
    status: string;
    duration: number;
    results: {
      leads: number;
      meetings: number;
      tasks: number;
      notes: number;
    };
  };
  permissionChecks: {
    status: string;
    totalDuration: number;
    results: Array<{
      permission: string;
      hasPermission: boolean;
      duration: number;
    }>;
  };
  dashboardComparison: {
    status: string;
    results: Array<{
      name: string;
      status: number;
      duration: number;
      success: boolean;
      dataSize: number;
      cacheStatus: string;
    }>;
  };
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  totalDuration: number;
  performanceAnalysis: {
    regularVsOptimized: number;
    regularVsUltra: number;
    optimizedVsUltra: number;
    fastest: string;
  };
  recommendations: string[];
  bottleneckAnalysis: {
    isDatabase: boolean;
    isPermission: boolean;
    isVercel: boolean;
    isNetwork: boolean;
    isMemory: boolean;
  };
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/performance-enhanced");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getDurationColor = (duration: number) => {
    if (duration < 100) return "text-green-600";
    if (duration < 500) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceTrend = (improvement: number) => {
    if (improvement > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (improvement < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading performance metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchMetrics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{metrics.environment}</Badge>
              <Badge variant="outline">{metrics.region}</Badge>
              <Button onClick={fetchMetrics} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span>Total Duration:</span>
              <span
                className={`font-mono ${getDurationColor(
                  metrics.totalDuration
                )}`}
              >
                {metrics.totalDuration}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span>Memory Usage:</span>
              <span className="font-mono">
                {metrics.memoryUsage.heapUsed}MB /{" "}
                {metrics.memoryUsage.heapTotal}MB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>Fastest Dashboard:</span>
              <Badge variant="secondary">
                {metrics.performanceAnalysis.fastest}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Connection</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.dbConnection.status)}
                <span
                  className={`font-mono ${getDurationColor(
                    metrics.dbConnection.duration
                  )}`}
                >
                  {metrics.dbConnection.duration}ms
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Simple Query</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.simpleQuery.status)}
                <span
                  className={`font-mono ${getDurationColor(
                    metrics.simpleQuery.duration
                  )}`}
                >
                  {metrics.simpleQuery.duration}ms
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Complex Queries</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.complexQueries.status)}
                <span
                  className={`font-mono ${getDurationColor(
                    metrics.complexQueries.duration
                  )}`}
                >
                  {metrics.complexQueries.duration}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Dashboard Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.dashboardComparison.results.map((result) => (
              <div
                key={result.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize">{result.name}</span>
                  {result.cacheStatus === "hit" && (
                    <Badge variant="outline" className="text-xs">
                      Cached
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.success ? "success" : "error")}
                  <span
                    className={`font-mono ${getDurationColor(result.duration)}`}
                  >
                    {result.duration}ms
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {getPerformanceTrend(
                metrics.performanceAnalysis.regularVsOptimized
              )}
              <span>Regular vs Optimized:</span>
              <Badge
                variant={
                  metrics.performanceAnalysis.regularVsOptimized > 0
                    ? "default"
                    : "secondary"
                }
              >
                {metrics.performanceAnalysis.regularVsOptimized}% improvement
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getPerformanceTrend(metrics.performanceAnalysis.regularVsUltra)}
              <span>Regular vs Ultra:</span>
              <Badge
                variant={
                  metrics.performanceAnalysis.regularVsUltra > 0
                    ? "default"
                    : "secondary"
                }
              >
                {metrics.performanceAnalysis.regularVsUltra}% improvement
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getPerformanceTrend(
                metrics.performanceAnalysis.optimizedVsUltra
              )}
              <span>Optimized vs Ultra:</span>
              <Badge
                variant={
                  metrics.performanceAnalysis.optimizedVsUltra > 0
                    ? "default"
                    : "secondary"
                }
              >
                {metrics.performanceAnalysis.optimizedVsUltra}% improvement
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bottleneck Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Database</span>
              <Badge
                variant={
                  metrics.bottleneckAnalysis.isDatabase
                    ? "destructive"
                    : "default"
                }
              >
                {metrics.bottleneckAnalysis.isDatabase ? "Slow" : "OK"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Permissions</span>
              <Badge
                variant={
                  metrics.bottleneckAnalysis.isPermission
                    ? "destructive"
                    : "default"
                }
              >
                {metrics.bottleneckAnalysis.isPermission ? "Slow" : "OK"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Vercel</span>
              <Badge
                variant={
                  metrics.bottleneckAnalysis.isVercel ? "default" : "secondary"
                }
              >
                {metrics.bottleneckAnalysis.isVercel ? "OK" : "Slow"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Network</span>
              <Badge
                variant={
                  metrics.bottleneckAnalysis.isNetwork
                    ? "destructive"
                    : "default"
                }
              >
                {metrics.bottleneckAnalysis.isNetwork ? "Slow" : "OK"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Memory</span>
              <Badge
                variant={
                  metrics.bottleneckAnalysis.isMemory
                    ? "destructive"
                    : "default"
                }
              >
                {metrics.bottleneckAnalysis.isMemory ? "High" : "OK"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
