import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "@/components/tasks/TasksTable";
import { toast } from "sonner";

/**
 * Simplified task actions hook - no complex caching, just reliable API calls and invalidation
 */
export function useTaskActionsProduction() {
  const queryClient = useQueryClient();

  // Prevent rapid successive API calls
  const actionInProgress = useRef<Set<string>>(new Set());

  const handleToggleTaskCompletion = useCallback(
    async (task: Task) => {
      const actionKey = `toggle-${task.id}`;

      // Prevent duplicate requests
      if (actionInProgress.current.has(actionKey)) {
        return;
      }

      const newStatus = task.status === "Completed" ? "Pending" : "Completed";
      const completedAt =
        newStatus === "Completed" ? new Date().toISOString() : null;

      // Mark action as in progress
      actionInProgress.current.add(actionKey);

      try {
        console.log(
          `🔄 Toggling task ${task.id} status: ${task.status} → ${newStatus}`
        );

        // Make API call (no optimistic updates to avoid conflicts)
        const response = await fetch(
          `/api/leads/${task.lead.id}/tasks/${task.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to update task status (${response.status})`
          );
        }

        console.log(
          `✅ Task ${task.id} toggled successfully, invalidating all queries`
        );

        // Force fresh data by invalidating all task queries (don't remove them)
        console.log(
          "🔄 Before invalidation - existing queries:",
          queryClient.getQueryCache().findAll({ queryKey: ["tasks"] }).length
        );

        // Invalidate all task queries (marks them as stale and triggers refetch)
        await queryClient.invalidateQueries({
          queryKey: ["tasks"],
          refetchType: "all",
        });

        console.log("♻️ Invalidated all task queries, triggering refetch");

        // Wait a moment for React Query to process the invalidation
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log(
          "🔄 After invalidation - existing queries:",
          queryClient.getQueryCache().findAll({ queryKey: ["tasks"] }).length
        );

        console.log("✅ All task queries invalidated and refreshing");

        toast.success(`Task marked as ${newStatus.toLowerCase()}`);
      } catch (error) {
        // Invalidate queries on error to ensure consistency
        await queryClient.invalidateQueries({
          queryKey: ["tasks"],
          refetchType: "all",
        });

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update task status";
        toast.error(message);

        console.error("Error toggling task completion:", error);
      } finally {
        // Clear action lock
        actionInProgress.current.delete(actionKey);
      }
    },
    [queryClient]
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      const actionKey = `delete-${task.id}`;

      if (actionInProgress.current.has(actionKey)) {
        return;
      }

      // Confirm deletion
      if (
        !window.confirm(
          "Are you sure you want to delete this task? This action cannot be undone."
        )
      ) {
        return;
      }

      actionInProgress.current.add(actionKey);

      try {
        console.log(`🗑️ Deleting task ${task.id}`);

        // Make API call (no optimistic updates)
        const response = await fetch(
          `/api/leads/${task.lead.id}/tasks/${task.id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to delete task (${response.status})`
          );
        }

        console.log(
          `✅ Task ${task.id} deleted successfully, invalidating all queries`
        );

        // Aggressive cache invalidation and refetch
        await queryClient.removeQueries({
          queryKey: ["tasks"],
        });

        await queryClient.refetchQueries({
          queryKey: ["tasks"],
          type: "active",
        });

        // Also specifically invalidate analytics
        await queryClient.invalidateQueries({
          queryKey: ["tasks", "analytics"],
          refetchType: "all",
        });

        console.log("✅ All task queries invalidated and refetched");

        toast.success("Task deleted successfully");
      } catch (error) {
        // Invalidate queries on error to ensure consistency
        await queryClient.invalidateQueries({
          queryKey: ["tasks"],
          refetchType: "all",
        });

        const message =
          error instanceof Error ? error.message : "Failed to delete task";
        toast.error(message);

        console.error("Error deleting task:", error);
      } finally {
        actionInProgress.current.delete(actionKey);
      }
    },
    [queryClient]
  );

  const handleTaskUpdate = useCallback(
    async (task: Task, updates: Partial<Task>) => {
      const actionKey = `update-${task.id}`;

      if (actionInProgress.current.has(actionKey)) {
        return;
      }

      actionInProgress.current.add(actionKey);

      try {
        console.log(`📝 Updating task ${task.id}:`, updates);

        // Make API call (no optimistic updates)
        const response = await fetch(
          `/api/leads/${task.lead.id}/tasks/${task.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to update task (${response.status})`
          );
        }

        console.log(
          `✅ Task ${task.id} updated successfully, invalidating all queries`
        );

        // Aggressive cache invalidation and refetch
        await queryClient.removeQueries({
          queryKey: ["tasks"],
        });

        await queryClient.refetchQueries({
          queryKey: ["tasks"],
          type: "active",
        });

        // Also specifically invalidate analytics
        await queryClient.invalidateQueries({
          queryKey: ["tasks", "analytics"],
          refetchType: "all",
        });

        console.log("✅ All task queries invalidated and refetched");

        toast.success("Task updated successfully");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update task";
        toast.error(message);

        console.error("Error updating task:", error);
      } finally {
        actionInProgress.current.delete(actionKey);
      }
    },
    [queryClient]
  );

  const handleCreateTask = useCallback(
    async (taskData: any, leadId?: number) => {
      try {
        console.log(`➕ Creating new task`, taskData);

        const endpoint = leadId ? `/api/leads/${leadId}/tasks` : "/api/tasks";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to create task (${response.status})`
          );
        }

        console.log(`✅ Task created successfully, invalidating all queries`);

        // Aggressive cache invalidation and refetch
        await queryClient.removeQueries({
          queryKey: ["tasks"],
        });

        await queryClient.refetchQueries({
          queryKey: ["tasks"],
          type: "active",
        });

        // Also specifically invalidate analytics
        await queryClient.invalidateQueries({
          queryKey: ["tasks", "analytics"],
          refetchType: "all",
        });

        console.log("✅ All task queries invalidated and refetched");

        toast.success("Task created successfully");
        return await response.json();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create task";
        toast.error(message);

        console.error("Error creating task:", error);
        throw error;
      }
    },
    [queryClient]
  );

  const invalidateQueries = useCallback(async () => {
    try {
      console.log(`🔄 Manually invalidating all task queries`);
      await queryClient.invalidateQueries({
        queryKey: ["tasks"],
        refetchType: "all",
      });
    } catch (error) {
      console.error("Error invalidating task queries:", error);
    }
  }, [queryClient]);

  const resetFilters = useCallback(() => {
    console.log(`🔄 Resetting filters - invalidating all task queries`);
    queryClient.invalidateQueries({
      queryKey: ["tasks"],
      refetchType: "all",
    });
  }, [queryClient]);

  return {
    handleToggleTaskCompletion,
    handleDeleteTask,
    handleTaskUpdate,
    handleCreateTask,
    invalidateQueries,
    resetFilters,
  };
}
