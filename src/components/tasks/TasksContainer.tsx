"use client";

import { memo, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import TasksTable, { Task } from "./TasksTable";
import { FilterState, SortState } from "./TaskFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
// Removed TASK_CONFIG import - using direct values for simplicity

interface TasksResponse {
  tasks: Task[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: number | null;
    limit: number;
  };
}

interface TasksContainerProps {
  filters: FilterState;
  sort: SortState;
  onToggleTaskCompletion: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

const TasksContainer = memo(function TasksContainer({
  filters,
  sort,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
}: TasksContainerProps) {
  const { data: session } = useSession();

  // Debounce filters to prevent excessive API calls - only search is debounced
  const debouncedSearch = useDebouncedValue(
    filters.search,
    300 // 300ms debounce
  );

  // Create debounced filters object for API calls
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  // Memoize query key with debounced filters
  const queryKey = useMemo(
    () => ["tasks", debouncedFilters, sort],
    [debouncedFilters, sort]
  );

  // Data fetching isolated to this component with production-level error handling
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status: queryStatus,
  } = useInfiniteQuery<TasksResponse>({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const url = new URL("/api/tasks", window.location.origin);
      if (pageParam) {
        url.searchParams.set("cursor", pageParam.toString());
      }
      url.searchParams.set("limit", "20"); // 20 items per page

      // Add filter parameters to API request using debounced filters
      if (debouncedFilters.status !== "all") {
        url.searchParams.set("status", debouncedFilters.status);
      }
      if (debouncedFilters.priority !== "all") {
        url.searchParams.set("priority", debouncedFilters.priority);
      }
      if (debouncedFilters.category !== "all") {
        url.searchParams.set("category", debouncedFilters.category);
      }
      if (debouncedFilters.assignee !== "all") {
        url.searchParams.set("assignee", debouncedFilters.assignee);
      }
      if (debouncedFilters.search.trim()) {
        url.searchParams.set("search", debouncedFilters.search.trim());
      }
      if (debouncedFilters.includeDeleted) {
        url.searchParams.set("includeDeleted", "true");
      }

      // Add sort parameters to API request
      url.searchParams.set("sortField", sort.field);
      url.searchParams.set("sortDirection", sort.direction);

      const response = await fetch(url.toString(), { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch tasks");
      }

      return result.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    enabled: !!session,
    staleTime: 0, // Always fetch fresh data - no caching delays
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: false,
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Flatten all pages into a single array
  const allTasks = useMemo(
    () => data?.pages?.flatMap((page) => page.tasks) ?? [],
    [data]
  );

  // Debug logs removed

  if (queryStatus === "pending") {
    return (
      <Card>
        <CardContent className="p-2 sm:p-6 flex flex-col">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Tasks</h2>
          </div>
          <div className="flex items-center justify-center h-64 sm:h-96">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            <span className="ml-2 text-sm sm:text-base">Loading tasks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queryStatus === "error") {
    return (
      <Card>
        <CardContent className="p-2 sm:p-6 flex flex-col">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Tasks</h2>
          </div>
          <div className="flex items-center justify-center h-64 sm:h-96">
            <div className="text-center px-4">
              <p className="text-red-600 mb-4 text-sm sm:text-base">
                Error loading tasks: {error?.message || "Unknown error"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 sm:px-4 text-sm sm:text-base bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 overflow-hidden p-2 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">
              Tasks ({allTasks.length})
            </h2>
            {isFetching && !isFetchingNextPage && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="hidden sm:inline">Refreshing...</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <TasksTable
              tasks={allTasks}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onFetchNextPage={fetchNextPage}
              onToggleTaskCompletion={onToggleTaskCompletion}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              isLoading={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default TasksContainer;
