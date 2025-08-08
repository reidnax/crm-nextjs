"use client";

import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import SearchInput from "./SearchInput";
import {
  Plus,
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flag,
  Target,
  TrendingUp,
  Settings,
  BarChart3,
  Loader2,
} from "lucide-react";
import { getPriorityColor, getTaskStatusColor } from "@/lib/utils";
import { TASK_CATEGORIES } from "@/lib/validations/task-validation";

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  category: string;
  assignee: string;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface TaskAnalytics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface TaskHeaderCompactProps {
  filters: FilterState;
  sort: SortState;
  analytics: TaskAnalytics | undefined;
  isAnalyticsLoading: boolean;
  analyticsError: Error | null;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSortChange: (field: string) => void;
  onClearFilters: () => void;
  onAddTask: () => void;
}

const QUICK_FILTERS = [
  {
    label: "High Priority",
    filters: { priority: "High" },
    color: "bg-red-100 text-red-700",
  },
  {
    label: "My Tasks",
    filters: { assignee: "me" },
    color: "bg-purple-100 text-purple-700",
  },
  {
    label: "In Progress",
    filters: { status: "In Progress" },
    color: "bg-blue-100 text-blue-700",
  },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  ...TASK_CATEGORIES.map((category) => ({
    value: category.value,
    label: category.label,
  })),
];

const ASSIGNEE_OPTIONS = [
  { value: "all", label: "All Assignees" },
  { value: "me", label: "My Tasks" },
  { value: "unassigned", label: "Unassigned" },
];

const TaskHeaderCompact = memo(function TaskHeaderCompact({
  filters,
  sort,
  analytics,
  isAnalyticsLoading,
  analyticsError,
  onFilterChange,
  onSortChange,
  onClearFilters,
  onAddTask,
}: TaskHeaderCompactProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const hasActiveFilters =
    Object.values(filters).some((value, index) => {
      const keys = Object.keys(filters);
      return keys[index] !== "search" && value !== "all" && value !== "";
    }) || filters.search.trim() !== "";

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.status !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.category !== "all") count++;
    if (filters.assignee !== "all") count++;
    return count;
  };

  const handleQuickFilter = (quickFilters: Partial<FilterState>) => {
    Object.entries(quickFilters).forEach(([key, value]) => {
      if (value !== undefined) {
        onFilterChange(key as keyof FilterState, value);
      }
    });
  };

  const taskStats = analytics;

  // Remove debug logs in production build

  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3">
      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Top Row: Title + Quick Stats + Add Button */}
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              Tasks
            </h1>
            {!isAnalyticsLoading && !analyticsError && taskStats && (
              <Popover open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {taskStats.total}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Task Analytics</h4>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-700">
                          {taskStats.total}
                        </div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {taskStats.pending}
                        </div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {taskStats.inProgress}
                        </div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {taskStats.completed}
                        </div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {taskStats.overdue}
                        </div>
                        <div className="text-xs text-gray-500">Overdue</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>
                          {taskStats.total > 0
                            ? Math.round(
                                (taskStats.completed / taskStats.total) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-green-500 h-1 rounded-full transition-all"
                          style={{
                            width:
                              taskStats.total > 0
                                ? `${
                                    (taskStats.completed / taskStats.total) *
                                    100
                                  }%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {isAnalyticsLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Loading analytics...</span>
              </div>
            )}
          </div>

          {/* Mobile Add Button */}
          <div className="sm:hidden">
            <Button onClick={onAddTask} size="sm" className="h-8 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Inline Quick Stats - Desktop */}
          {!isAnalyticsLoading && !analyticsError && taskStats && (
            <div className="hidden lg:flex items-center gap-2 text-xs">
              {taskStats.pending > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-700 text-xs h-5"
                >
                  {taskStats.pending} pending
                </Badge>
              )}
              {taskStats.inProgress > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 text-xs h-5"
                >
                  {taskStats.inProgress} active
                </Badge>
              )}
              {taskStats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 text-xs h-5"
                >
                  {taskStats.overdue} overdue
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Search Row - Full width on mobile */}
        <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-2xl">
          <div className="flex-1 sm:max-w-sm">
            <SearchInput
              value={filters.search}
              onChange={(value) => onFilterChange("search", value)}
              placeholder="Search tasks..."
            />
          </div>

          {/* Quick Filter Pills - Hidden on mobile, visible on larger screens */}
          <div className="hidden xl:flex items-center gap-1">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.filters)}
                className={`h-7 px-2 text-xs ${filter.color} border-transparent`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Left Side: Mobile Stats */}
          <div className="flex items-center gap-2 sm:hidden">
            {!isAnalyticsLoading &&
              !analyticsError &&
              taskStats &&
              taskStats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 text-xs h-5"
                >
                  {taskStats.overdue} overdue
                </Badge>
              )}
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs h-5">
                {getActiveFilterCount()} filters
              </Badge>
            )}
          </div>

          {/* Right Side: Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Active Filters Count - Desktop */}
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="text-xs h-6 hidden sm:inline-flex"
              >
                {getActiveFilterCount()}
              </Badge>
            )}

            {/* Sort Controls */}
            <div className="flex gap-1">
              <Button
                variant={sort.field === "dueDate" ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange("dueDate")}
                className="h-7 px-1 sm:px-2"
              >
                <Calendar className="h-3 w-3" />
                {sort.field === "dueDate" &&
                  (sort.direction === "asc" ? (
                    <SortAsc className="h-3 w-3 ml-0.5 sm:ml-1" />
                  ) : (
                    <SortDesc className="h-3 w-3 ml-0.5 sm:ml-1" />
                  ))}
              </Button>
              <Button
                variant={sort.field === "priority" ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange("priority")}
                className="h-7 px-1 sm:px-2"
              >
                <Flag className="h-3 w-3" />
                {sort.field === "priority" &&
                  (sort.direction === "asc" ? (
                    <SortAsc className="h-3 w-3 ml-0.5 sm:ml-1" />
                  ) : (
                    <SortDesc className="h-3 w-3 ml-0.5 sm:ml-1" />
                  ))}
              </Button>
            </div>

            {/* Advanced Filters */}
            <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-1 sm:px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-4" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Advanced Filters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        Status
                      </label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) =>
                          onFilterChange("status", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        Priority
                      </label>
                      <Select
                        value={filters.priority}
                        onValueChange={(value) =>
                          onFilterChange("priority", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        Category
                      </label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) =>
                          onFilterChange("category", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        Assignee
                      </label>
                      <Select
                        value={filters.assignee}
                        onValueChange={(value) =>
                          onFilterChange("assignee", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNEE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Mobile Quick Filters */}
                  <div className="sm:hidden">
                    <label className="text-xs text-gray-600 mb-2 block">
                      Quick Filters
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_FILTERS.map((filter) => (
                        <Button
                          key={filter.label}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickFilter(filter.filters)}
                          className={`h-7 px-3 text-xs ${filter.color} border-transparent`}
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearFilters}
                      className="w-full"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Filters - Desktop */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-7 px-2 hidden sm:flex"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* Add Task - Desktop */}
            <Button
              onClick={onAddTask}
              size="sm"
              className="h-7 px-3 hidden sm:flex"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskHeaderCompact;
