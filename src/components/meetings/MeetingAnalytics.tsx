"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";

export interface MeetingAnalytics {
  overview: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    completionRate: number;
    averageDuration: number;
  };
  timeMetrics: {
    today: number;
    thisWeek: number;
    upcoming: number;
    overdue: number;
  };
  breakdown: {
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
  trends: {
    recentActivity: Array<{ status: string; _count: { id: number } }>;
  };
}

interface MeetingAnalyticsProps {
  analytics: MeetingAnalytics | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

const MeetingAnalytics = memo(function MeetingAnalytics({
  analytics,
  isLoading = false,
  error = null,
  className = "",
}: MeetingAnalyticsProps) {
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, timeMetrics, breakdown } = analytics;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Meetings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.total}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {overview.scheduled}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {overview.completed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {overview.completionRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Time Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-lg font-semibold text-blue-700">
                {timeMetrics.today}
              </p>
              <p className="text-sm text-blue-600">Today</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-lg font-semibold text-green-700">
                {timeMetrics.thisWeek}
              </p>
              <p className="text-sm text-green-600">This Week</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-lg font-semibold text-purple-700">
                {timeMetrics.upcoming}
              </p>
              <p className="text-sm text-purple-600">Upcoming</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-lg font-semibold text-red-700">
                {timeMetrics.overdue}
              </p>
              <p className="text-sm text-red-600">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status and Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(breakdown.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === "Completed" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {status === "Scheduled" && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    {status === "Cancelled" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {status === "In Progress" && (
                      <Activity className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meeting Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(breakdown.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Priority Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(breakdown.byPriority).map(([priority, count]) => (
              <div
                key={priority}
                className={`text-center p-4 rounded-lg ${
                  {
                    High: "bg-red-50 text-red-700",
                    Medium: "bg-yellow-50 text-yellow-700",
                    Low: "bg-green-50 text-green-700",
                  }[priority] || "bg-gray-50 text-gray-700"
                }`}
              >
                <p className="text-lg font-semibold">{count}</p>
                <p className="text-sm">{priority} Priority</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Average Duration
                </span>
                <span className="text-lg font-semibold">
                  {overview.averageDuration} minutes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  In Progress
                </span>
                <span className="text-lg font-semibold text-blue-600">
                  {overview.inProgress}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Cancelled
                </span>
                <span className="text-lg font-semibold text-red-600">
                  {overview.cancelled}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Success Rate
                </span>
                <span className="text-lg font-semibold text-green-600">
                  {Math.round(
                    (overview.completed / (overview.total || 1)) * 100
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default MeetingAnalytics;
