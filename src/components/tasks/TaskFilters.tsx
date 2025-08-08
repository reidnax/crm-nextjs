"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchInput from "./SearchInput";
import { Filter, Calendar, SortAsc, SortDesc } from "lucide-react";
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

interface TaskFiltersProps {
  filters: FilterState;
  sort: SortState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSortChange: (field: string) => void;
}

const TaskFilters = memo(function TaskFilters({
  filters,
  sort,
  onFilterChange,
  onSortChange,
}: TaskFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <SearchInput
            value={filters.search}
            onChange={(value) => onFilterChange("search", value)}
            placeholder="Search tasks..."
          />
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.priority}
            onValueChange={(value) => onFilterChange("priority", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.category}
            onValueChange={(value) => onFilterChange("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TASK_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.assignee}
            onValueChange={(value) => onFilterChange("assignee", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="me">My Tasks</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={sort.field === "dueDate" ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange("dueDate")}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Due Date
              {sort.field === "dueDate" &&
                (sort.direction === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                ))}
            </Button>
            <Button
              variant={sort.field === "priority" ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange("priority")}
              className="flex items-center gap-1"
            >
              Priority
              {sort.field === "priority" &&
                (sort.direction === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                ))}
            </Button>
            <Button
              variant={sort.field === "status" ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange("status")}
              className="flex items-center gap-1"
            >
              Status
              {sort.field === "status" &&
                (sort.direction === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                ))}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default TaskFilters;
