"use client";

import React, { memo } from "react";
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

interface TaskFiltersAdvancedProps {
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

const TaskFiltersAdvanced = memo(function TaskFiltersAdvanced({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onClearFilters,
}: TaskFiltersAdvancedProps) {
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Filters */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Quick Filters</h4>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(filter.filters)}
                  className={`${filter.color} border`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Search */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Search</h4>
          <SearchInput
            value={filters.search}
            onChange={(value) => onFilterChange("search", value)}
            placeholder="Search tasks, descriptions, or leads..."
          />
        </div>

        <Separator />

        {/* Filter Controls */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange("status", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {filters.status === "all" ? (
                      "All Status"
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(
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
                          {Icon && <Icon className="h-4 w-4" />}
                          {option.value === "all" ? (
                            option.label
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Priority
              </label>
              <Select
                value={filters.priority}
                onValueChange={(value) => onFilterChange("priority", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {filters.priority === "all" ? (
                      "All Priority"
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
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
                          {Icon && <Icon className="h-4 w-4" />}
                          {option.value === "all" ? (
                            option.label
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Category
              </label>
              <Select
                value={filters.category}
                onValueChange={(value) => onFilterChange("category", value)}
              >
                <SelectTrigger className="h-9">
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Assignee
              </label>
              <Select
                value={filters.assignee}
                onValueChange={(value) => onFilterChange("assignee", value)}
              >
                <SelectTrigger className="h-9">
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
        </div>

        <Separator />

        {/* Sort Controls */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Sort Options</h4>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = sort.field === option.field;
              return (
                <Button
                  key={option.field}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSortChange(option.field)}
                  className="flex items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                  {isActive &&
                    (sort.direction === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    ))}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Active Filters
              </h4>
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    Search: "{filters.search}"
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => onFilterChange("search", "")}
                    />
                  </Badge>
                )}
                {filters.status !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
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
                    className="flex items-center gap-1"
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
                    className="flex items-center gap-1"
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
                    className="flex items-center gap-1"
                  >
                    Assignee:{" "}
                    {filters.assignee === "me" ? "My Tasks" : filters.assignee}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => onFilterChange("assignee", "all")}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default TaskFiltersAdvanced;
