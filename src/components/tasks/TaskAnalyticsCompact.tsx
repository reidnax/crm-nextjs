"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  TrendingUp,
} from "lucide-react";

export interface TaskAnalytics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface TaskAnalyticsCompactProps {
  analytics: TaskAnalytics | undefined;
  isLoading: boolean;
  error: Error | null;
}

const TaskAnalyticsCompact = memo(function TaskAnalyticsCompact({
  analytics,
  isLoading,
  error,
}: TaskAnalyticsCompactProps) {
  // Default analytics while loading
  const defaultAnalytics = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  const taskStats = analytics || defaultAnalytics;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-center text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Failed to load analytics: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "Total",
      value: taskStats.total,
      icon: Activity,
      color: "text-gray-700",
      bgColor: "bg-gray-50",
    },
    {
      label: "Pending",
      value: taskStats.pending,
      icon: Clock,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
    },
    {
      label: "In Progress",
      value: taskStats.inProgress,
      icon: TrendingUp,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed",
      value: taskStats.completed,
      icon: CheckCircle,
      color: "text-green-700",
      bgColor: "bg-green-50",
    },
    {
      label: "Overdue",
      value: taskStats.overdue,
      icon: AlertTriangle,
      color: "text-red-700",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Task Overview</h3>
          <Badge variant="outline" className="text-xs">
            {taskStats.total} total
          </Badge>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bgColor} rounded-lg p-2 border border-gray-100`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`h-3 w-3 ${stat.color}`} />
                  <span className={`text-lg font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 truncate">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Indicators */}
        <div className="mt-3 space-y-1">
          {/* Completion Progress */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Completion Rate</span>
            <span>
              {taskStats.total > 0
                ? Math.round((taskStats.completed / taskStats.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width:
                  taskStats.total > 0
                    ? `${(taskStats.completed / taskStats.total) * 100}%`
                    : "0%",
              }}
            />
          </div>

          {/* Overdue Warning */}
          {taskStats.overdue > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {taskStats.overdue} task{taskStats.overdue !== 1 ? "s" : ""}{" "}
                overdue
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default TaskAnalyticsCompact;
