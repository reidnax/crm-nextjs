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
import SearchInput from "@/components/tasks/SearchInput";
import {
  Plus,
  Calendar,
  SortAsc,
  SortDesc,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  BarChart3,
  Loader2,
  MapPin,
  Video,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface MeetingFilterState {
  search: string;
  status: string;
  type: string;
  priority: string;
  dateRange: string;
  includeDeleted: boolean;
}

export interface MeetingSortState {
  field: string;
  direction: "asc" | "desc";
}

export interface MeetingAnalytics {
  total: number;
  scheduled: number;
  completed: number;
  inProgress: number;
  cancelled: number;
  overdue: number;
}

interface MeetingHeaderCompactProps {
  filters: MeetingFilterState;
  sort: MeetingSortState;
  analytics: MeetingAnalytics | undefined;
  isAnalyticsLoading: boolean;
  analyticsError: Error | null;
  onFilterChange: (
    key: keyof MeetingFilterState,
    value: string | boolean
  ) => void;
  onSortChange: (field: string) => void;
  onClearFilters: () => void;
  onAddMeeting: () => void;
  isAdmin?: boolean;
}

const QUICK_FILTERS = [
  {
    label: "Today",
    filters: { dateRange: "today" },
    color: "bg-blue-100 text-blue-700",
  },
  {
    label: "High Priority",
    filters: { priority: "High" },
    color: "bg-red-100 text-red-700",
  },
  {
    label: "In Progress",
    filters: { status: "In Progress" },
    color: "bg-yellow-100 text-yellow-700",
  },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Meeting", label: "Meeting" },
  { value: "Call", label: "Call" },
  { value: "Video Call", label: "Video Call" },
  { value: "Demo", label: "Demo" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
  { value: "this_month", label: "This Month" },
];

const MeetingHeaderCompact = memo(function MeetingHeaderCompact({
  filters,
  sort,
  analytics,
  isAnalyticsLoading,
  analyticsError,
  onFilterChange,
  onSortChange,
  onClearFilters,
  onAddMeeting,
  isAdmin = false,
}: MeetingHeaderCompactProps) {
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.priority !== "all" ||
    filters.dateRange !== "all" ||
    filters.includeDeleted === true;

  const handleQuickFilter = (quickFilters: Partial<MeetingFilterState>) => {
    Object.entries(quickFilters).forEach(([key, value]) => {
      if (value !== undefined) {
        onFilterChange(key as keyof MeetingFilterState, value);
      }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.status !== "all") count++;
    if (filters.type !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.dateRange !== "all") count++;
    if (filters.includeDeleted) count++;
    return count;
  };

  const meetingStats = analytics;

  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3">
      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Top Row: Title + Quick Stats + Add Button */}
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              Meetings
            </h1>
            {!isAnalyticsLoading && !analyticsError && meetingStats && (
              <Popover open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {meetingStats.total}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Meeting Analytics</h4>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-700">
                          {meetingStats.total}
                        </div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {meetingStats.scheduled}
                        </div>
                        <div className="text-xs text-gray-500">Scheduled</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {meetingStats.inProgress}
                        </div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {meetingStats.completed}
                        </div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {meetingStats.overdue}
                        </div>
                        <div className="text-xs text-gray-500">Overdue</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>
                          {meetingStats.total > 0
                            ? Math.round(
                                (meetingStats.completed / meetingStats.total) *
                                  100
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
                              meetingStats.total > 0
                                ? `${
                                    (meetingStats.completed /
                                      meetingStats.total) *
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
            <Button onClick={onAddMeeting} size="sm" className="h-8 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Inline Quick Stats - Desktop */}
          {!isAnalyticsLoading && !analyticsError && meetingStats && (
            <div className="hidden lg:flex items-center gap-2 text-xs">
              {meetingStats.scheduled > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 text-xs h-5"
                >
                  {meetingStats.scheduled} scheduled
                </Badge>
              )}
              {meetingStats.inProgress > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-700 text-xs h-5"
                >
                  {meetingStats.inProgress} active
                </Badge>
              )}
              {meetingStats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 text-xs h-5"
                >
                  {meetingStats.overdue} overdue
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
              placeholder="Search meetings..."
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
              meetingStats &&
              meetingStats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 text-xs h-5"
                >
                  {meetingStats.overdue} overdue
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
                variant={sort.field === "startTime" ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange("startTime")}
                className="h-7 px-1 sm:px-2"
              >
                <Calendar className="h-3 w-3" />
                {sort.field === "startTime" &&
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
                <AlertTriangle className="h-3 w-3" />
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Advanced Filters</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onClearFilters();
                          setIsFiltersOpen(false);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
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
                        Type
                      </label>
                      <Select
                        value={filters.type}
                        onValueChange={(value) => onFilterChange("type", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
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
                        Date Range
                      </label>
                      <Select
                        value={filters.dateRange}
                        onValueChange={(value) =>
                          onFilterChange("dateRange", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_RANGE_OPTIONS.map((option) => (
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

                  {/* Admin: Show Deleted Items Toggle */}
                  {isAdmin && (
                    <div>
                      <label className="text-xs text-gray-600 mb-2 block">
                        Admin Options
                      </label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="meetingIncludeDeleted"
                          checked={filters.includeDeleted}
                          onCheckedChange={(checked) =>
                            onFilterChange("includeDeleted", checked as boolean)
                          }
                        />
                        <label
                          htmlFor="meetingIncludeDeleted"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Show deleted items
                        </label>
                        {filters.includeDeleted ? (
                          <Eye className="h-4 w-4 text-gray-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  )}

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

            {/* Desktop Add Button */}
            <Button
              onClick={onAddMeeting}
              size="sm"
              className="h-7 px-2 hidden sm:flex"
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden lg:inline">Add</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MeetingHeaderCompact;
