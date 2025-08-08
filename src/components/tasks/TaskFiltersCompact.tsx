"use client";

import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import SearchInput from "./SearchInput";
import {
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Flag,
  Target,
  Zap,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Settings,
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

interface TaskFiltersCompactProps {
  filters: FilterState;
  sort: SortState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSortChange: (field: string) => void;
  onClearFilters: () => void;
}

// Quick filter presets for common task scenarios
const QUICK_FILTERS = [
  {
    label: "Due Today",
    icon: Clock,
    filters: { status: "Pending", search: "" },
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    label: "High Priority",
    icon: Flag,
    filters: { priority: "High" },
    color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  },
  {
    label: "In Progress",
    icon: TrendingUp,
    filters: { status: "In Progress" },
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    label: "My Tasks",
    icon: Target,
    filters: { assignee: "me" },
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  {
    label: "Completed",
    icon: CheckCircle,
    filters: { status: "Completed" },
    color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", icon: null, color: "" },
  {
    value: "Pending",
    label: "Pending",
    icon: AlertCircle,
    color: getTaskStatusColor("Pending"),
  },
  {
    value: "In Progress",
    label: "In Progress",
    icon: Clock,
    color: getTaskStatusColor("In Progress"),
  },
  {
    value: "Completed",
    label: "Completed",
    icon: CheckCircle,
    color: getTaskStatusColor("Completed"),
  },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority", icon: null, color: "" },
  { value: "High", label: "High", icon: Flag, color: getPriorityColor("High") },
  {
    value: "Medium",
    label: "Medium",
    icon: Flag,
    color: getPriorityColor("Medium"),
  },
  { value: "Low", label: "Low", icon: Flag, color: getPriorityColor("Low") },
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

const SORT_OPTIONS = [
  { field: "dueDate", label: "Due Date", icon: Calendar },
  { field: "priority", label: "Priority", icon: Flag },
  { field: "status", label: "Status", icon: CheckCircle },
  { field: "createdAt", label: "Created", icon: Clock },
];

const TaskFiltersCompact = memo(function TaskFiltersCompact({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onClearFilters,
}: TaskFiltersCompactProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const hasActiveFilters =
    Object.values(filters).some((value, index) => {
      const keys = Object.keys(filters);
      return keys[index] !== "search" && value !== "all" && value !== "";
    }) || filters.search.trim() !== "";

  const handleQuickFilter = (quickFilters: Partial<FilterState>) => {
    Object.entries(quickFilters).forEach(([key, value]) => {
      if (value !== undefined) {
        onFilterChange(key as keyof FilterState, value);
      }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.status !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.category !== "all") count++;
    if (filters.assignee !== "all") count++;
    return count;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Top Row: Search + Quick Actions */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <SearchInput
              value={filters.search}
              onChange={(value) => onFilterChange("search", value)}
              placeholder="Search tasks..."
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Filter Count */}
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()} active
              </Badge>
            )}

            {/* Sort Button */}
            <div className="flex gap-1">
              {SORT_OPTIONS.slice(0, 2).map((option) => {
                const Icon = option.icon;
                const isActive = sort.field === option.field;
                return (
                  <Button
                    key={option.field}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSortChange(option.field)}
                    className="h-8 px-2"
                  >
                    <Icon className="h-3 w-3" />
                    {isActive &&
                      (sort.direction === "asc" ? (
                        <SortAsc className="h-3 w-3 ml-1" />
                      ) : (
                        <SortDesc className="h-3 w-3 ml-1" />
                      ))}
                  </Button>
                );
              })}
            </div>

            {/* Advanced Filters Toggle */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <Settings className="h-3 w-3 mr-1" />
                  Filters
                  {isAdvancedOpen ? (
                    <ChevronUp className="h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </CollapsibleTrigger>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-8 px-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Collapsible>
          </div>
        </div>

        {/* Quick Filter Pills - Always Visible */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.filters)}
                className={`h-7 px-2 text-xs ${filter.color} border`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleContent className="space-y-4">
            <Separator />

            {/* Advanced Filter Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => onFilterChange("status", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>
                      {filters.status === "all" ? (
                        "All Status"
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(
                              filters.status
                            )}`}
                          >
                            {filters.status}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-3 w-3" />}
                            {option.value === "all" ? (
                              option.label
                            ) : (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}
                              >
                                {option.label}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Priority
                </label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => onFilterChange("priority", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>
                      {filters.priority === "all" ? (
                        "All Priority"
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                              filters.priority
                            )}`}
                          >
                            {filters.priority}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-3 w-3" />}
                            {option.value === "all" ? (
                              option.label
                            ) : (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}
                              >
                                {option.label}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Category
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => onFilterChange("category", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Categories" />
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

              {/* Assignee Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Assignee
                </label>
                <Select
                  value={filters.assignee}
                  onValueChange={(value) => onFilterChange("assignee", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Assignees" />
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

            {/* Additional Sort Options */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                More Sort Options
              </label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.slice(2).map((option) => {
                  const Icon = option.icon;
                  const isActive = sort.field === option.field;
                  return (
                    <Button
                      key={option.field}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSortChange(option.field)}
                      className="h-7 px-2 text-xs flex items-center gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {option.label}
                      {isActive &&
                        (sort.direction === "asc" ? (
                          <SortAsc className="h-3 w-3" />
                        ) : (
                          <SortDesc className="h-3 w-3" />
                        ))}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">
                  Active Filters
                </label>
                <div className="flex flex-wrap gap-1">
                  {filters.search && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs h-6 px-2"
                    >
                      Search: "{filters.search.substring(0, 10)}
                      {filters.search.length > 10 ? "..." : ""}"
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => onFilterChange("search", "")}
                      />
                    </Badge>
                  )}
                  {filters.status !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs h-6 px-2"
                    >
                      Status: {filters.status}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => onFilterChange("status", "all")}
                      />
                    </Badge>
                  )}
                  {filters.priority !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs h-6 px-2"
                    >
                      Priority: {filters.priority}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => onFilterChange("priority", "all")}
                      />
                    </Badge>
                  )}
                  {filters.category !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs h-6 px-2"
                    >
                      Category: {filters.category}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => onFilterChange("category", "all")}
                      />
                    </Badge>
                  )}
                  {filters.assignee !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs h-6 px-2"
                    >
                      Assignee:{" "}
                      {filters.assignee === "me"
                        ? "My Tasks"
                        : filters.assignee}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => onFilterChange("assignee", "all")}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
});

export default TaskFiltersCompact;
