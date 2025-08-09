"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import TaskCard from "./TaskCard";
import { Task } from "./TasksTable";
import TaskDialog from "@/components/dialogs/task-dialog";

interface LeadTasksProps {
  leadId: number;
  leadName?: string;
  leadCompany?: string;
  className?: string;
  maxHeight?: string;
}

export default function LeadTasks({
  leadId,
  leadName = "Lead",
  leadCompany,
  className = "",
  maxHeight = "600px",
}: LeadTasksProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task;
  }>({ isOpen: false });

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    task?: Task;
  }>({ isOpen: false });

  // Fetch tasks for this lead
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}/tasks`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch tasks");
      }

      const data = await response.json();

      // Transform tasks to include lead information since TaskCard expects it
      const tasksWithLead = data.data.map((task: any) => ({
        ...task,
        lead: {
          id: leadId,
          name: leadName,
          company: leadCompany || task.lead?.company || null,
        },
      }));

      setTasks(tasksWithLead);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [leadId, leadName, leadCompany]);

  // Task actions
  const handleCreateTask = () => {
    setTaskDialog({ isOpen: true });
  };

  const handleEditTask = (task: Task) => {
    setTaskDialog({
      isOpen: true,
      task: {
        ...task,
        dueDate: new Date(task.dueDate).toISOString().slice(0, 10),
      },
    });
  };

  const handleDeleteTask = (task: Task) => {
    setDeleteDialog({ isOpen: true, task });
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    try {
      const newStatus = task.status === "Completed" ? "Pending" : "Completed";

      const response = await fetch(`/api/leads/${leadId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: newStatus,
          ...(newStatus === "Completed"
            ? { completedAt: new Date().toISOString() }
            : { completedAt: null }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const result = await response.json();
      const updatedTask = result.data;

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? updatedTask : t))
      );

      toast.success(`Task marked as ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const confirmDelete = async () => {
    const task = deleteDialog.task;
    if (!task) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    } finally {
      setDeleteDialog({ isOpen: false });
    }
  };

  // Dialog handlers
  const handleTaskCreated = (task: Task) => {
    // Ensure the task has proper lead information
    const taskWithLead = {
      ...task,
      lead: {
        id: leadId,
        name: leadName,
        company: leadCompany || task.lead?.company || null,
      },
    };
    setTasks((prev) => [taskWithLead, ...prev]);
    setTaskDialog({ isOpen: false });
  };

  const handleTaskUpdated = (task: Task) => {
    // Ensure the task has proper lead information
    const taskWithLead = {
      ...task,
      lead: {
        id: leadId,
        name: leadName,
        company: leadCompany || task.lead?.company || null,
      },
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? taskWithLead : t))
    );
    setTaskDialog({ isOpen: false });
  };

  // Effects
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;
  const overdueTasks = tasks.filter(
    (t) => new Date(t.dueDate) < new Date() && t.status !== "Completed"
  ).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks ({totalTasks})
          </CardTitle>
          <Button
            onClick={handleCreateTask}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Quick Stats */}
        {totalTasks > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{completedTasks} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{pendingTasks} pending</span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{overdueTasks} overdue</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading tasks...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchTasks} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalTasks === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">
              No tasks created for {leadName}
            </p>
            <Button onClick={handleCreateTask} variant="outline">
              Create First Task
            </Button>
          </div>
        )}

        {/* Tasks List */}
        {!isLoading && !error && totalTasks > 0 && (
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight }}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleCompletion={handleToggleTaskCompletion}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={taskDialog.isOpen}
        onClose={() => setTaskDialog({ isOpen: false })}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
        initialData={taskDialog.task}
        leadId={leadId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.task?.subject}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 