"use client";

import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import TaskDialog from "@/components/dialogs/task-dialog";
import { Task } from "@/components/tasks/TasksTable";
import TasksContainer from "@/components/tasks/TasksContainer";
import TaskHeaderCompact, {
  FilterState,
  SortState,
  TaskAnalytics,
} from "@/components/tasks/TaskHeaderCompact";
import { useTaskActionsProduction } from "@/hooks/useTaskActionsProduction";
import ErrorBoundary, {
  SimpleErrorFallback,
} from "@/components/ui/error-boundary";
import { Loader2 } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { isAdminRole } from "@/lib/permissions";

// TanStack imports
import { useQuery } from "@tanstack/react-query";
// Removed TASK_CONFIG import - using direct values for simplicity

export default function TasksPage() {
  const { data: session, status } = useSession();
  const {
    handleToggleTaskCompletion,
    handleDeleteTask,
    handleCreateTask,
    invalidateQueries,
  } = useTaskActionsProduction();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    task?: Task;
  }>({ isOpen: false });

  // Filter and sorting state - only UI state, no data fetching
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    assignee: "all",
    includeDeleted: false,
  });
  const [sort, setSort] = useState<SortState>({
    field: "dueDate",
    direction: "asc",
  });

  // Analytics query for real task statistics (separate from main tasks)
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery<TaskAnalytics, Error>({
    queryKey: ["tasks", "analytics"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/analytics", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch task analytics");
      }

      return result.data;
    },
    enabled: !!session,
    staleTime: 0, // Always fetch fresh analytics - no caching delays
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Task actions with stable references
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditTaskDialogOpen(true);
  }, []);

  const handleCloseEditTaskDialog = useCallback(() => {
    setEditingTask(null);
    setIsEditTaskDialogOpen(false);
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string | boolean) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSortChange = useCallback((field: string) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      category: "all",
      assignee: "all",
      includeDeleted: false,
    });
    setSort({
      field: "dueDate",
      direction: "asc",
    });
  }, []);

  // Delete confirmation wrapper
  const handleDeleteTaskWithConfirmation = useCallback((task: Task) => {
    setDeleteDialog({ isOpen: true, task });
  }, []);

  const confirmDeleteTask = useCallback(async () => {
    if (!deleteDialog.task) return;

    // Call the actual delete function from the hook
    await handleDeleteTask(deleteDialog.task);
    setDeleteDialog({ isOpen: false });
  }, [deleteDialog.task, handleDeleteTask]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Ultra-Compact Header */}
      <div className="flex-shrink-0">
        <TaskHeaderCompact
          filters={filters}
          sort={sort}
          analytics={analytics}
          isAnalyticsLoading={analyticsLoading}
          analyticsError={analyticsError}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          onAddTask={() => setIsTaskDialogOpen(true)}
          isAdmin={isAdminRole(session?.user?.role)}
        />
      </div>

      {/* Tasks Container - Take remaining height */}
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
        <ErrorBoundary fallback={SimpleErrorFallback}>
          <TasksContainer
            filters={filters}
            sort={sort}
            onToggleTaskCompletion={handleToggleTaskCompletion}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTaskWithConfirmation}
          />
        </ErrorBoundary>
      </div>

      {/* Debug Panel removed */}

      {/* Task Dialog for creating new tasks */}
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        onSuccess={() => {
          setIsTaskDialogOpen(false);
          invalidateQueries();
        }}
        showLeadSelector={true}
        onSubmitOverride={handleCreateTask}
      />

      {/* Edit Task Dialog */}
      {editingTask && (
        <TaskDialog
          isOpen={isEditTaskDialogOpen}
          onClose={handleCloseEditTaskDialog}
          onSuccess={() => {
            handleCloseEditTaskDialog();
            invalidateQueries();
          }}
          title="Edit Task"
          description="Update task details and status."
          submitButtonText="Update Task"
          submitButtonLoadingText="Updating..."
          apiEndpoint={`/api/leads/${editingTask.lead.id}/tasks/${editingTask.id}`}
          initialData={{
            subject: editingTask.subject,
            description: editingTask.description || "",
            dueDate: editingTask.dueDate,
            priority: editingTask.priority || "Medium",
            status: editingTask.status || "Pending",
            category: editingTask.category || "Other",
            estimatedHours: editingTask.estimatedHours,
            actualHours: editingTask.actualHours,
            assignedTo: editingTask.assignedTo,
            reminderDate: editingTask.reminderDate,
            tags: editingTask.tags || [],
            isRecurring: editingTask.isRecurring || false,
            leadId: editingTask.lead.id,
          }}
          showStatusField={true}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        description={
          deleteDialog.task
            ? `Are you sure you want to delete "${deleteDialog.task.subject}"? This action cannot be undone.`
            : ""
        }
      />
    </div>
  );
}
